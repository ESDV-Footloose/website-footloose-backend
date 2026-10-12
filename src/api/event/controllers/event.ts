import { factories } from "@strapi/strapi";
import { sendTemplateEmail } from "../../../utils/mailer";

const EVENT_UID = "api::event.event" as const;

type StrapiUser = {
  id: number;
  email: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  approved?: boolean;
};

type EventEntity = {
  documentId: string;
  name: string;
  slug: string;
  eventCode: string;
  date: string;
  location: string | null;
  organizer: string | null;
  organizerEmail: string | null;
  image: { url: string; alternativeText: string | null } | null;
  description: unknown;
  price: number | string;
  memberPrice: number | string | null;
  personLimit: number | null;
  requiresSubscription: boolean;
  membersOnly: boolean;
  registrationDeadline: string | null;
  deregistrationDeadline: string | null;
  attendees?: StrapiUser[];
};

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(date));
}

function fullName(person: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
}

/** Only approved members are treated as members. */
function isApprovedMember(user?: StrapiUser): boolean {
  return Boolean(user?.approved);
}

/** Only approved members can see members-only events. */
function isVisible(event: EventEntity, user?: StrapiUser): boolean {
  return !event.membersOnly || isApprovedMember(user);
}

function toPublicEvent(
  event: EventEntity,
  user?: StrapiUser,
  includeAttendeeNames = false,
) {
  const attendees = event.attendees ?? [];
  const now = new Date();

  const price = Number(event.price);
  const memberPrice =
    event.memberPrice != null ? Number(event.memberPrice) : null;
  const hasMemberPrice = memberPrice != null && memberPrice !== price;
  const isMember = isApprovedMember(user);

  return {
    documentId: event.documentId,
    name: event.name,
    slug: event.slug,
    date: event.date,
    location: event.location ?? null,
    organizer: event.organizer ?? null,
    organizerEmail: event.organizerEmail ?? null,
    image: event.image
      ? {
          url: event.image.url,
          alternativeText: event.image.alternativeText,
        }
      : null,
    description: event.description,
    price,
    memberPrice: hasMemberPrice ? memberPrice : null,
    applicablePrice: isMember && memberPrice != null ? memberPrice : price,
    requiresSubscription: event.requiresSubscription,
    membersOnly: event.membersOnly,
    isMember,
    personLimit: event.personLimit ?? null,
    spotsTaken: attendees.length,
    registrationDeadline: event.registrationDeadline ?? null,
    deregistrationDeadline: event.deregistrationDeadline ?? null,
    isPast: new Date(event.date) < now,
    isRegistrationClosed:
      now > new Date(event.registrationDeadline ?? event.date),
    isDeregistrationClosed:
      now > new Date(event.deregistrationDeadline ?? event.date),
    isFull:
      event.requiresSubscription &&
      event.personLimit != null &&
      attendees.length >= event.personLimit,
    isSubscribed: user
      ? attendees.some((attendee) => attendee.id === user.id)
      : false,
    /** Only filled in for approved members. */
    attendeeNames: includeAttendeeNames
      ? attendees
          .map(
            (attendee) => fullName(attendee) || attendee.username || "Member",
          )
          .sort((a, b) => a.localeCompare(b))
      : null,
  };
}

export default factories.createCoreController(EVENT_UID, ({ strapi }) => {
  const getEvent = async (documentId: string): Promise<EventEntity | null> =>
    (await strapi.documents(EVENT_UID).findOne({
      documentId,
      status: "published",
      populate: ["image", "attendees"],
    })) as unknown as EventEntity | null;

  /**
   * Saves the attendee list
   */
  const saveAttendees = async (documentId: string, attendeeIds: number[]) => {
    await strapi.documents(EVENT_UID).update({
      documentId,
      status: "published",
      data: { attendees: attendeeIds },
    });
  };

  /** Email failures must never make a (successful) subscription fail. */
  const trySendEmail = async (send: () => Promise<unknown>) => {
    try {
      await send();
    } catch (err) {
      strapi.log.error(`Failed to send event email: ${err}`);
    }
  };

  return {
    async find(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;

      const page = Math.max(1, Number(ctx.query.page) || 1);
      const pageSize = Math.min(
        50, // Artificial max, this should be high enough
        Math.max(1, Number(ctx.query.pageSize) || 6),
      );

      const filters: Record<string, unknown> = {
        date: { $gte: new Date().toISOString() },
      };

      if (!isApprovedMember(user)) {
        filters.membersOnly = false;
      }

      // Fetch one extra row to find out whether there is a next page.
      const events = (await strapi.documents(EVENT_UID).findMany({
        status: "published",
        filters,
        sort: [{ date: "asc" }],
        populate: ["image", "attendees"],
        limit: pageSize + 1,
        start: (page - 1) * pageSize,
      })) as unknown as EventEntity[];

      const hasMore = events.length > pageSize;

      ctx.body = {
        data: events
          .slice(0, pageSize)
          .map((event) => toPublicEvent(event, user)),
        meta: { page, pageSize, hasMore },
      };
    },

    /** Events the current user is subscribed to, from today onwards. */
    async myEvents(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;
      if (!user) return ctx.unauthorized();

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0); // uses the server's timezone

      const events = (await strapi.documents(EVENT_UID).findMany({
        status: "published",
        filters: {
          date: { $gte: startOfToday.toISOString() },
          attendees: { id: { $eq: user.id } },
        },
        sort: ["date:asc"],
        populate: ["image", "attendees"],
      })) as unknown as EventEntity[];

      ctx.body = { data: events.map((event) => toPublicEvent(event, user)) };
    },

    async findOne(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;
      const { id: slug } = ctx.params;

      const events = (await strapi.documents(EVENT_UID).findMany({
        status: "published",
        filters: { slug },
        populate: ["image", "attendees"],
      })) as unknown as EventEntity[];

      const event = events[0];
      if (!event || !isVisible(event, user)) {
        return ctx.notFound("Event not found.");
      }

      // Attendee names are only visible to approved members.
      ctx.body = {
        data: toPublicEvent(event, user, isApprovedMember(user)),
      };
    },

    async subscribe(ctx) {
      const user = ctx.state.user as StrapiUser;
      const { documentId } = ctx.params;

      const event = await getEvent(documentId);
      if (!event || !isVisible(event, user)) {
        return ctx.notFound("Event not found.");
      }

      const current = toPublicEvent(event, user);

      if (!current.requiresSubscription) {
        return ctx.badRequest("This event does not require subscription.");
      }
      if (current.membersOnly && !current.isMember) {
        return ctx.forbidden("This event is for members only.");
      }
      if (current.isRegistrationClosed) {
        return ctx.badRequest("Registration for this event is closed.");
      }
      if (current.isSubscribed) {
        return ctx.badRequest("You are already subscribed to this event.");
      }
      if (current.isFull) {
        return ctx.badRequest("This event is full.");
      }

      await saveAttendees(documentId, [
        ...(event.attendees ?? []).map((a) => a.id),
        user.id,
      ]);

      const updated = (await getEvent(documentId)) ?? event;
      const result = toPublicEvent(updated, user);

      await trySendEmail(() =>
        sendTemplateEmail("eventSubscribed", user.email, {
          name: user.firstName ?? user.email,
          eventName: result.name,
          eventCode: event.eventCode,
          memberId: user.id,
          slug: result.slug,
          date: formatDateTime(result.date),
          location: result.location ?? "",
          price: result.applicablePrice,
          organizer: result.organizer,
          organizerEmail: result.organizerEmail,
        }),
      );

      ctx.body = { data: result };
    },

    async unsubscribe(ctx) {
      const user = ctx.state.user as StrapiUser;
      const { documentId } = ctx.params;

      const event = await getEvent(documentId);
      if (!event || !isVisible(event, user)) {
        return ctx.notFound("Event not found.");
      }

      const current = toPublicEvent(event, user);
      if (current.isDeregistrationClosed) {
        return ctx.badRequest("The deregistration deadline has passed.");
      }

      const attendees = event.attendees ?? [];
      const remaining = attendees.filter((a) => a.id !== user.id);

      if (remaining.length === attendees.length) {
        return ctx.badRequest("You are not subscribed to this event.");
      }

      await saveAttendees(
        documentId,
        remaining.map((a) => a.id),
      );

      await trySendEmail(() =>
        sendTemplateEmail("eventUnsubscribed", user.email, {
          name: user.firstName ?? user.email,
          eventName: event.name,
          slug: event.slug,
          date: formatDateTime(event.date),
          organizer: event.organizer,
          organizerEmail: event.organizerEmail,
        }),
      );

      const updated = (await getEvent(documentId)) ?? event;
      ctx.body = { data: toPublicEvent(updated, user) };
    },
  };
});
