import type { Core } from "@strapi/strapi";
import { sendTemplateEmail } from "./utils/mailer";

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ["plugin::users-permissions.user"],

      /**
       * Sends a welcome email after a new account is created.
       *
       * @param event The user creation lifecycle event.
       */
      async afterCreate(event) {
        const { result } = event;
        await sendTemplateEmail("signupWelcome", result.email, {
          name: result.firstName ?? result.email,
        });

        // If an account is manually created with approved = true, this is treated as
        // a direct transition to this state, so the approval email is sent.
        if (result.approved) {
          await sendTemplateEmail("accountApproved", result.email, {
            name: result.firstName ?? result.email,
          });
        }
      },

      /**
       * Stores the user's approval state before an update is applied.
       * params.data only contains the values submitted in an update.
       * In particular, this e.g. prevents members from getting membership approval emails when
       * their active member status is changed.
       *
       * @param event The user update lifecycle event.
       */
      async beforeUpdate(event) {
        const { params } = event;

        const current = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({
            where: params.where,
            select: ["approved"],
          });

        event.state = event.state ?? {};
        event.state.wasApproved = !!current?.approved;
      },

      /**
       * Sends a membership approval email when a user's approval state changes from false to true.
       *
       * @param event The user update lifecycle event.
       */
      async afterUpdate(event) {
        const { result } = event;

        const wasApproved = event.state?.wasApproved ?? false;
        const isApproved = !!result.approved;

        // Only fire on the actual false -> true transition, not whenever
        // an update payload happens to include approved: true.
        if (wasApproved || !isApproved) return;

        await sendTemplateEmail("accountApproved", result.email, {
          name: result.firstName ?? result.email,
        });
      },
    });
  },
};
