import { factories } from "@strapi/strapi";

function toPublicEvent(event: any, currentUserId?: number) {
  const attendees = event.attendees ?? [];
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
    price: event.price,
    requiresSubscription: event.requiresSubscription,
    personLimit: event.personLimit ?? null,
    spotsTaken: attendees.length,
    isPast: new Date(event.date) < new Date(),
    isFull:
      event.requiresSubscription &&
      event.personLimit != null &&
      attendees.length >= event.personLimit,
    isSubscribed: currentUserId
      ? attendees.some((a: any) => a.id === currentUserId)
      : false,
  };
}

export default factories.createCoreController(
  "api::event.event",
  ({ strapi }) => ({
    async list(ctx) {
      const events = await strapi.documents("api::event.event").findMany({
        filters: { date: { $gte: new Date().toISOString() } },
        sort: ["date:asc"],
        populate: ["image", "attendees"],
      });

      const currentUserId = ctx.state.user?.id;
      ctx.body = {
        data: events.map((e: any) => toPublicEvent(e, currentUserId)),
      };
    },

    async findBySlug(ctx) {
      const { slug } = ctx.params;

      const events = await strapi.documents("api::event.event").findMany({
        filters: { slug },
        populate: ["image", "attendees"],
      });

      const event = events[0];
      if (!event) return ctx.notFound("Event not found.");

      const currentUserId = ctx.state.user?.id;
      ctx.body = { data: toPublicEvent(event, currentUserId) };
    },

    async subscribe(ctx) {
      const userId = ctx.state.user.id;
      const { documentId } = ctx.params;

      const event = await strapi.documents("api::event.event").findOne({
        documentId,
        populate: ["attendees"],
      });
      if (!event) return ctx.notFound("Event not found.");

      if (!event.requiresSubscription) {
        return ctx.badRequest("This event does not require subscription.");
      }
      if (new Date(event.date) < new Date()) {
        return ctx.badRequest("This event has already taken place.");
      }

      const attendees = event.attendees ?? [];
      if (attendees.some((a: any) => a.id === userId)) {
        return ctx.badRequest("You are already subscribed to this event.");
      }
      if (event.personLimit != null && attendees.length >= event.personLimit) {
        return ctx.badRequest("This event is full.");
      }

      await strapi.documents("api::event.event").update({
        documentId,
        data: { attendees: [...attendees.map((a: any) => a.id), userId] },
      });

      const updated = await strapi.documents("api::event.event").findOne({
        documentId,
        populate: ["image", "attendees"],
      });
      ctx.body = { data: toPublicEvent(updated, userId) };
    },

    async unsubscribe(ctx) {
      const userId = ctx.state.user.id;
      const { documentId } = ctx.params;

      const event = await strapi.documents("api::event.event").findOne({
        documentId,
        populate: ["attendees"],
      });
      if (!event) return ctx.notFound("Event not found.");

      const attendees = event.attendees ?? [];
      const remaining = attendees.filter((a: any) => a.id !== userId);

      if (remaining.length === attendees.length) {
        return ctx.badRequest("You are not subscribed to this event.");
      }

      await strapi.documents("api::event.event").update({
        documentId,
        data: { attendees: remaining.map((a: any) => a.id) },
      });

      const updated = await strapi.documents("api::event.event").findOne({
        documentId,
        populate: ["image", "attendees"],
      });
      ctx.body = { data: toPublicEvent(updated, userId) };
    },
  }),
);
