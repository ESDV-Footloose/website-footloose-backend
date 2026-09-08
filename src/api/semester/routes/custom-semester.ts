export default {
  routes: [
    {
      method: "POST",
      path: "/semesters/:documentId/close",
      handler: "semester.close",
    },
  ],
};
