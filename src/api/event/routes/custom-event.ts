export default {
  routes: [
    { method: "GET", path: "/events/me/upcoming", handler: "event.myEvents" },
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
