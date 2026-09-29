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
  date: string;
  location: string | null;
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
  const isMember = Boolean(user?.approved);

  return {
    documentId: event.documentId,
    name: event.name,
    slug: event.slug,
    date: event.date,
    location: event.location ?? null,
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
    /** Only filled in for logged-in users. */
    attendeeNames: includeAttendeeNames
      ? [...attendees.map((attendee) => fullName(attendee))].sort((a, b) =>
          a.localeCompare(b),
        )
      : null,
  };
}

export default factories.createCoreController(EVENT_UID, ({ strapi }) => {
  const getEvent = async (documentId: string): Promise<EventEntity | null> =>
    (await strapi.documents(EVENT_UID).findOne({
      documentId,
      populate: ["image", "attendees"],
    })) as unknown as EventEntity | null;

  const present = async (
    events: EventEntity[],
    user?: StrapiUser,
    includeAttendeeNames = false,
  ) => {
    return events.map((event) =>
      toPublicEvent(event, user, includeAttendeeNames),
    );
  };

  const presentOne = async (
    event: EventEntity,
    user?: StrapiUser,
    includeAttendeeNames = false,
  ) => {
    return toPublicEvent(event, user, includeAttendeeNames);
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
    async list(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;

      const events = (await strapi.documents(EVENT_UID).findMany({
        filters: { date: { $gte: new Date().toISOString() } },
        sort: ["date:asc"],
        populate: ["image", "attendees"],
      })) as unknown as EventEntity[];

      ctx.body = { data: await present(events, user) };
    },

    /** Events the current user is subscribed to, from today onwards. */
    async mine(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;
      if (!user) return ctx.unauthorized();

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0); // uses the server's timezone

      const events = (await strapi.documents(EVENT_UID).findMany({
        filters: {
          date: { $gte: startOfToday.toISOString() },
          attendees: { id: { $eq: user.id } },
        },
        sort: ["date:asc"],
        populate: ["image", "attendees"],
      })) as unknown as EventEntity[];

      ctx.body = { data: await present(events, user) };
    },

    async findBySlug(ctx) {
      const user = ctx.state.user as StrapiUser | undefined;
      const { slug } = ctx.params;

      const events = (await strapi.documents(EVENT_UID).findMany({
        filters: { slug },
        populate: ["image", "attendees"],
      })) as unknown as EventEntity[];

      const event = events[0];
      if (!event) return ctx.notFound("Event not found.");

      // Attendee names are only visible to logged-in users.
      ctx.body = { data: await presentOne(event, user, Boolean(user)) };
    },

    async subscribe(ctx) {
      const user = ctx.state.user as StrapiUser;
      const { documentId } = ctx.params;

      const event = await getEvent(documentId);
      if (!event) return ctx.notFound("Event not found.");

      const current = await presentOne(event, user);

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

      await strapi.documents(EVENT_UID).update({
        documentId,
        data: {
          attendees: [...(event.attendees ?? []).map((a) => a.id), user.id],
        },
      });

      const updated = (await getEvent(documentId)) ?? event;
      const result = await presentOne(updated, user);

      await trySendEmail(() =>
        sendTemplateEmail("eventSubscribed", user.email, {
          name: user.firstName ?? user.email,
          eventName: result.name,
          slug: result.slug,
          date: formatDateTime(result.date),
          location: result.location ?? "",
          price: result.applicablePrice,
        }),
      );

      ctx.body = { data: result };
    },

    async unsubscribe(ctx) {
      const user = ctx.state.user as StrapiUser;
      const { documentId } = ctx.params;

      const event = await getEvent(documentId);
      if (!event) return ctx.notFound("Event not found.");

      const current = await presentOne(event, user);
      if (current.isDeregistrationClosed) {
        return ctx.badRequest("The deregistration deadline has passed.");
      }

      const attendees = event.attendees ?? [];
      const remaining = attendees.filter((a) => a.id !== user.id);

      if (remaining.length === attendees.length) {
        return ctx.badRequest("You are not subscribed to this event.");
      }

      await strapi.documents(EVENT_UID).update({
        documentId,
        data: { attendees: remaining.map((a) => a.id) },
      });

      await trySendEmail(() =>
        sendTemplateEmail("eventUnsubscribed", user.email, {
          name: user.firstName ?? user.email,
          eventName: event.name,
          slug: event.slug,
          date: formatDateTime(event.date),
        }),
      );

      const updated = (await getEvent(documentId)) ?? event;
      ctx.body = { data: await presentOne(updated, user) };
    },
  };
});
