import { sendTemplateEmail } from "../../../../utils/mailer";
import type { CourseListItem } from "../../../../utils/mailer/templates";

/**
 * Represents a single course selected as part of a subscription.
 */
interface CourseSelection {
  /** Whether this course was marked as a priority course. */
  isPriority?: boolean;
  /** The selected dance course, denoted by style and level. */
  danceCourse?: { style?: string; level?: string };
}

/**
 * Represents the member associated with a subscription.
 */
interface Member {
  /** The member's email address. */
  email?: string;
  /** The member's first name. */
  firstName?: string;
}

/**
 * Represents a subscription from a member with all courses.
 */
interface FullSubscription {
  /** The Strapi document ID of the subscription. */
  documentId: string;
  /** The member who owns the subscription. */
  member?: Member;
  /** The courses selecte in the subscription. */
  courseSelections?: CourseSelection[];
}

/**
 * The shape of the event argument Strapi passes into a content-type's lifecycle hooks.
 */
interface SubscriptionLifecycleEvent {
  result: { documentId: string };
}

/**
 * Loads a full subscription from Strapi with member and dance courses.
 *
 * @param documentId The Strapi document ID of the subscription.
 * @returns The populated subscription.
 */
async function loadFullSubscription(
  documentId: string,
): Promise<FullSubscription> {
  return strapi.documents("api::subscription.subscription").findOne({
    documentId,
    populate: {
      member: true,
      courseSelections: { populate: ["danceCourse"] },
    },
  }) as unknown as Promise<FullSubscription>;
}

/**
 * Formats a course level for display in email.
 * Numeric levels are reduced to just the number like in the dance class schedule.
 * Other levels have their first letter capitalized.
 *
 * @param level The raw course level.
 * @returns The formatted course level.
 */
function formatLevel(level?: string): string {
  if (!level) return "";
  const numbered = level.match(/\((\d+)\)/);
  if (numbered) return numbered[1];
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Converts the course selections into the format for the subscription email template.
 * Priority courses are placed before non-priority courses (if applicable).
 *
 * @param subscription The populated subscription with dance courses.
 * @returns The formatted list of selected courses.
 */
function buildCourseList(subscription: FullSubscription): CourseListItem[] {
  return (subscription.courseSelections ?? [])
    .slice()
    .sort((a, b) => Number(!!b.isPriority) - Number(!!a.isPriority))
    .map((selection) => {
      const course = selection.danceCourse;
      const courseName = course
        ? `${course.style} ${formatLevel(course.level)}`.trim()
        : "Unknown course";
      return { courseName, isPriority: !!selection.isPriority };
    });
}

/**
 * Sends a course subscription confirmation email.
 *
 * @param documentId The Strapi document ID of the subscription.
 */
function notifySubscription(documentId: string): void {
  setImmediate(async () => {
    try {
      const full = await loadFullSubscription(documentId);
      const email = full.member?.email;
      if (!email) return;

      const courses = buildCourseList(full);
      if (courses.length === 0) return;

      await sendTemplateEmail("subscriptionSaved", email, {
        name: full.member?.firstName ?? email,
        courses,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.error(`subscriptionSaved email failed: ${message}`);
    }
  });
}

/**
 * Strapi lifecycle hooks for subscription entities. An email is sent after
 * a subscription is created or updated.
 */
export default {
  afterCreate(event: SubscriptionLifecycleEvent) {
    notifySubscription(event.result.documentId);
  },
  afterUpdate(event: SubscriptionLifecycleEvent) {
    notifySubscription(event.result.documentId);
  },
};
