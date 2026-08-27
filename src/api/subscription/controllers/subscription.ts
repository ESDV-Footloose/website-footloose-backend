import { factories } from "@strapi/strapi";

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
        .findMany({ filters: { isActive: true } });
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
            populate: ["danceCourses", "priorityCourses"],
          });

        if (existing[0]) {
          subscription = {
            courseIds: existing[0].danceCourses.map((c: any) => c.documentId),
            priorityCourseIds: existing[0].priorityCourses.map(
              (c: any) => c.documentId,
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
          })),
          subscription,
        },
      };
    },

    async updateMe(ctx) {
      const userId = ctx.state.user.id;
      const { courseIds, priorityCourseIds, agreedToPay } =
        ctx.request.body ?? {};

      if (agreedToPay !== true) {
        return ctx.badRequest("You must agree to pay if admitted.");
      }
      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return ctx.badRequest("Select at least one course.");
      }

      const semesters = await strapi
        .documents("api::semester.semester")
        .findMany({ filters: { isActive: true } });
      const semester = semesters[0];
      if (!semester) return ctx.badRequest("No active semester.");
      if (new Date(semester.registrationDeadline) < new Date()) {
        return ctx.badRequest("Registration deadline has passed.");
      }

      const priorityIds: string[] = priorityCourseIds ?? [];
      if (priorityIds.some((id) => !courseIds.includes(id))) {
        return ctx.badRequest(
          "Priority pick must be one of the selected courses.",
        );
      }

      const userFull = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({ documentId: ctx.state.user.documentId });

      if (priorityIds.length > 0 && !userFull.activeMember) {
        return ctx.forbidden("Only active members can set priority picks.");
      }

      const courses = await strapi
        .documents("api::dance-course.dance-course")
        .findMany({ filters: { documentId: { $in: courseIds } } });

      const styleCounts: Record<string, number> = {};
      for (const id of priorityIds) {
        const course = courses.find((c: any) => c.documentId === id);
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
        });

      const data = {
        member: userId,
        semester: semester.documentId,
        danceCourses: courseIds,
        priorityCourses: priorityIds,
        agreedToPay: true,
        status: "pending" as const,
      };

      if (existing[0]) {
        await strapi
          .documents("api::subscription.subscription")
          .update({ documentId: existing[0].documentId, data });
      } else {
        await strapi
          .documents("api::subscription.subscription")
          .create({ data });
      }

      ctx.body = { data: { courseIds, priorityCourseIds: priorityIds } };
    },

    async export(ctx) {
      const subscriptions = await strapi
        .documents("api::subscription.subscription")
        .findMany({
          populate: ["member", "semester", "danceCourses", "priorityCourses"],
        });

      const rows: string[][] = [
        [
          "Member",
          "Email",
          "Semester",
          "Dance Style",
          "Level",
          "Priority",
          "Agreed To Pay",
        ],
      ];

      for (const sub of subscriptions) {
        const priorityIds = new Set(
          (sub.priorityCourses ?? []).map((c: any) => c.documentId),
        );
        for (const course of sub.danceCourses ?? []) {
          rows.push([
            `${sub.member?.firstName ?? ""} ${sub.member?.lastName ?? ""}`.trim(),
            sub.member?.email ?? "",
            sub.semester?.name ?? "",
            course.style,
            course.level,
            priorityIds.has(course.documentId) ? "Yes" : "No",
            sub.agreedToPay ? "Yes" : "No",
          ]);
        }
      }

      const csv = rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
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
