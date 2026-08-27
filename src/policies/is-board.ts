import type { Core } from "@strapi/strapi";

const isBoard: Core.MiddlewareHandler = async (ctx, next) => {
  const user = ctx.state.user;

  if (!user) {
    return ctx.unauthorized("You must be logged in.");
  }

  // role is not populated on ctx.state.user by default — fetch it explicitly
  const fullUser = await strapi
    .documents("plugin::users-permissions.user")
    .findOne({ documentId: user.documentId, populate: ["role"] });

  if (fullUser?.role?.type !== "board") {
    return ctx.forbidden("Board members only.");
  }

  await next();
};

export default isBoard;
