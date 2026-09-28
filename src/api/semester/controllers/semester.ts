/**
 * semester controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::semester.semester",
  ({ strapi }) => ({
    async close(ctx) {
      const { documentId } = ctx.params;

      const semester = await strapi
        .documents("api::semester.semester")
        .findOne({ documentId });

      if (!semester) {
        return ctx.notFound("Semester not found.");
      }

      const subscriptions = await strapi
        .documents("api::subscription.subscription")
        .findMany({
          filters: { semester: { documentId } },
        });

      await strapi.db.transaction(async () => {
        for (const sub of subscriptions) {
          await strapi
            .documents("api::subscription.subscription")
            .delete({ documentId: sub.documentId });
        }

        await strapi
          .documents("api::semester.semester")
          .update({ documentId, data: { isActive: false } });
      });

      ctx.body = { closed: true, subscriptionsDeleted: subscriptions.length };
    },
  }),
);
