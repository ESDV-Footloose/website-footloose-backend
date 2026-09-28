export default {
  routes: [
    { method: "GET", path: "/subscriptions/me", handler: "subscription.me" },
    {
      method: "PUT",
      path: "/subscriptions/me",
      handler: "subscription.updateMe",
    },
    {
      method: "GET",
      path: "/subscriptions/export",
      handler: "subscription.export",
    },
  ],
};
