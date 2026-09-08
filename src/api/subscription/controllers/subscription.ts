import { factories } from "@strapi/strapi";

type SelectionInput = {
  courseId: string;
  role: "leader" | "follower" | "solo";
  partnerName?: string;
  isPriority?: boolean;
};

// Must start with a letter, then letters/spaces/apostrophes/periods/hyphens.
// Protection against injections.
const PARTNER_NAME_PATTERN = /^\p{L}[\p{L}\s'.-]{0,99}$/u;

export default factories.createCoreController(
  "api::subscription.subscription",
  ({ strapi }) => ({
    async me(ctx) {
      const userId = ctx.state.user.id;

      const userFull = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({ documentId: ctx.state.user.documentId });

      const semesters = await strapi
        .documents("api::semester.semester")
        .findMany({
          filters: { isActive: true },
          sort: ["registrationDeadline:desc"],
        });
      const semester = semesters[0] ?? null;

      const courses = await strapi
        .documents("api::dance-course.dance-course")
        .findMany({ sort: ["style:asc", "level:asc"] });

      let subscription = null;
      let isEditable = false;

      if (semester) {
        isEditable = new Date(semester.registrationDeadline) > new Date();

        const existing = await strapi
          .documents("api::subscription.subscription")
          .findMany({
            filters: {
              member: { id: userId },
              semester: { documentId: semester.documentId },
            },
            populate: ["courseSelections", "courseSelections.danceCourse"],
          });

        if (existing[0]) {
          subscription = {
            selections: ((existing[0] as any).courseSelections ?? []).map(
              (s: any) => ({
                courseId: s.danceCourse.documentId,
                role: s.role,
                partnerName: s.partnerName ?? null,
                isPriority: s.isPriority,
              }),
            ),
          };
        }
      }

      ctx.body = {
        data: {
          semester: semester
            ? {
                documentId: semester.documentId,
                name: semester.name,
                registrationDeadline: semester.registrationDeadline,
              }
            : null,
          isEditable,
          isActiveMember: Boolean(userFull.activeMember),
          courses: courses.map((c: any) => ({
            documentId: c.documentId,
            style: c.style,
            level: c.level,
            isPartnerDance: c.isPartnerDance,
          })),
          subscription,
        },
      };
    },

    async updateMe(ctx) {
      const userId = ctx.state.user.id;
      const { selections, agreedToPay } = ctx.request.body ?? {};

      if (agreedToPay !== true) {
        return ctx.badRequest("You must agree to pay if admitted.");
      }
      if (!Array.isArray(selections) || selections.length === 0) {
        return ctx.badRequest("Select at least one course.");
      }

      const semesters = await strapi
        .documents("api::semester.semester")
        .findMany({
          filters: { isActive: true },
          sort: ["registrationDeadline:desc"],
        });
      const semester = semesters[0];
      if (!semester) return ctx.badRequest("No active semester.");
      if (new Date(semester.registrationDeadline) < new Date()) {
        return ctx.badRequest("Registration deadline has passed.");
      }

      const courseIds = selections.map((s: SelectionInput) => s.courseId);
      const courses = await strapi
        .documents("api::dance-course.dance-course")
        .findMany({ filters: { documentId: { $in: courseIds } } });
      const courseById = new Map(courses.map((c: any) => [c.documentId, c]));

      // Per-selection validation: role/partner name rules, based on
      // whether the course is a partner dance or a solo dance.
      for (const sel of selections as SelectionInput[]) {
        const course = courseById.get(sel.courseId);
        if (!course) return ctx.badRequest("Unknown course selected.");

        if (course.isPartnerDance) {
          if (sel.role !== "leader" && sel.role !== "follower") {
            return ctx.badRequest(
              `${course.style} ${course.level} requires a leader/follower role.`,
            );
          }
          if (!sel.partnerName || !sel.partnerName.trim()) {
            return ctx.badRequest(
              `Enter your partner's name for ${course.style} ${course.level}.`,
            );
          }
          if (!PARTNER_NAME_PATTERN.test(sel.partnerName.trim())) {
            return ctx.badRequest(
              `Partner name for ${course.style} ${course.level} must start with a letter and contain only letters, spaces, hyphens, apostrophes, or periods.`,
            );
          }
        } else if (sel.role !== "solo") {
          return ctx.badRequest(
            `${course.style} ${course.level} is a solo dance.`,
          );
        }
      }

      const userFull = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({ documentId: ctx.state.user.documentId });

      const priorityIds = (selections as SelectionInput[])
        .filter((s) => s.isPriority)
        .map((s) => s.courseId);

      if (priorityIds.length > 0 && !userFull.activeMember) {
        return ctx.forbidden("Only active members can set priority picks.");
      }

      const styleCounts: Record<string, number> = {};
      for (const id of priorityIds) {
        const course = courseById.get(id);
        if (!course) continue;
        styleCounts[course.style] = (styleCounts[course.style] ?? 0) + 1;
      }
      if (Object.values(styleCounts).some((count) => count > 1)) {
        return ctx.badRequest(
          "Only one priority pick allowed per dance style.",
        );
      }

      const existing = await strapi
        .documents("api::subscription.subscription")
        .findMany({
          filters: {
            member: { id: userId },
            semester: { documentId: semester.documentId },
          },
          populate: ["courseSelections"],
        });

      let subscriptionDocumentId: string;

      if (existing[0]) {
        subscriptionDocumentId = existing[0].documentId;
        await strapi.documents("api::subscription.subscription").update({
          documentId: subscriptionDocumentId,
          data: { agreedToPay: true },
        });

        // Re-fetch the relation with danceCourse populated so rows can be matched by course.
        const existingFull = await strapi
          .documents("api::subscription.subscription")
          .findOne({
            documentId: subscriptionDocumentId,
            populate: ["courseSelections", "courseSelections.danceCourse"],
          });
        const existingRows: any[] =
          (existingFull as any)?.courseSelections ?? [];
        const existingRowByCourseId = new Map(
          existingRows.map((s: any) => [s.danceCourse.documentId, s]),
        );

        const keepIds = new Set(courseIds);
        for (const row of existingRows) {
          if (!keepIds.has(row.danceCourse.documentId)) {
            await strapi
              .documents("api::course-selection.course-selection")
              .delete({ documentId: row.documentId });
          }
        }

        for (const sel of selections as SelectionInput[]) {
          const existingRow = existingRowByCourseId.get(sel.courseId);
          const data = {
            role: sel.role,
            partnerName: sel.role === "solo" ? null : sel.partnerName?.trim(),
            isPriority: Boolean(sel.isPriority),
          };
          if (existingRow) {
            await strapi
              .documents("api::course-selection.course-selection")
              .update({
                documentId: existingRow.documentId,
                data,
              });
          } else {
            await strapi
              .documents("api::course-selection.course-selection")
              .create({
                data: {
                  ...data,
                  subscription: subscriptionDocumentId,
                  danceCourse: sel.courseId,
                },
              });
          }
        }
      } else {
        const created = await strapi
          .documents("api::subscription.subscription")
          .create({
            data: {
              member: userId,
              semester: semester.documentId,
              agreedToPay: true,
            },
          });
        subscriptionDocumentId = created.documentId;

        for (const sel of selections as SelectionInput[]) {
          await strapi
            .documents("api::course-selection.course-selection")
            .create({
              data: {
                subscription: subscriptionDocumentId,
                danceCourse: sel.courseId,
                role: sel.role,
                partnerName:
                  sel.role === "solo" ? null : sel.partnerName?.trim(),
                isPriority: Boolean(sel.isPriority),
              },
            });
        }
      }

      ctx.body = { data: { selections } };
    },

    async export(ctx) {
      const subscriptions = await strapi
        .documents("api::subscription.subscription")
        .findMany({
          populate: [
            "member",
            "semester",
            "courseSelections",
            "courseSelections.danceCourse",
          ],
        });

      const rows: string[][] = [
        [
          "Member",
          "Email",
          "Semester",
          "Dance Style",
          "Level",
          "Role",
          "Partner Name",
          "Priority",
          "Agreed To Pay",
        ],
      ];

      for (const sub of subscriptions as any[]) {
        for (const sel of sub.courseSelections ?? []) {
          rows.push([
            `${sub.member?.firstName ?? ""} ${sub.member?.lastName ?? ""}`.trim(),
            sub.member?.email ?? "",
            sub.semester?.name ?? "",
            sel.danceCourse?.style ?? "",
            sel.danceCourse?.level ?? "",
            sel.role,
            sel.partnerName ?? "",
            sel.isPriority ? "Yes" : "No",
            sub.agreedToPay ? "Yes" : "No",
          ]);
        }
      }

      // Prevents CSV/formula injection
      const sanitizeCsvCell = (value: string): string =>
        /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

      const csv = rows
        .map((r) =>
          r
            .map(
              (cell) =>
                `"${sanitizeCsvCell(String(cell)).replace(/"/g, '""')}"`,
            )
            .join(","),
        )
        .join("\n");

      ctx.set("Content-Type", "text/csv");
      ctx.set(
        "Content-Disposition",
        'attachment; filename="subscriptions.csv"',
      );
      ctx.body = csv;
    },
  }),
);
