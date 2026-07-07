import type { Core } from "@strapi/strapi";

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  "users-permissions": {
    config: {
      register: {
        allowedFields: [
          "firstName",
          "lastName",
          "phoneNumber",
          "dateOfBirth",
          "studyInstitutionEnum",
          "studyInstitutionOther",
          "graduationYear",
          "motivationNotStudent",
        ],
      },
    },
  },
});

export default config;
