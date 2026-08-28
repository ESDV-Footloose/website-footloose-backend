export default {
  routes: [
    { method: "GET", path: "/events/list", handler: "event.list" },
    { method: "GET", path: "/events/slug/:slug", handler: "event.findBySlug" },
    {
      method: "POST",
      path: "/events/:documentId/subscribe",
      handler: "event.subscribe",
    },
    {
      method: "POST",
      path: "/events/:documentId/unsubscribe",
      handler: "event.unsubscribe",
    },
  ],
};
