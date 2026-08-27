export default {
  routes: [
    {
      method: "POST",
      path: "/semesters/:documentId/close",
      handler: "semester.close",
      config: {
        policies: ["global::is-board"],
      },
    },
  ],
};
