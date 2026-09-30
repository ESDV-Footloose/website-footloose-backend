import type { StrapiApp } from "@strapi/strapi/admin";
import { ExportUsersButton } from "./components/ExportUsersButton";

export default {
  config: {
    locales: [],
  },

  /**
   * Adds the "Export users" button to the users page.
   *
   * @param app The Strapi admin app.
   */
  bootstrap(app: StrapiApp) {
    app.getPlugin("content-manager").injectComponent("listView", "actions", {
      name: "export-users",
      Component: ExportUsersButton,
    });
  },
};
