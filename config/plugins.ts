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
          "studentEmail",
          "graduationYear",
          "motivationNotStudent",
        ],
      },
    },
  },
  // Send Strapi emails (e.g. password reset) through nodemailer.
  // Without SMTP_HOST, Strapi falls back to its default sendmail provider.
  ...(env("SMTP_HOST")
    ? {
        email: {
          config: {
            provider: "nodemailer",
            providerOptions: {
              host: env("SMTP_HOST"),
              port: env.int("SMTP_PORT", 587),
              secure: env.bool("SMTP_SECURE", false),
              auth: {
                user: env("SMTP_USER"),
                pass: env("SMTP_PASS"),
              },
            },
            settings: {
              defaultFrom: env("SMTP_FROM"),
              defaultReplyTo: env("SMTP_FROM"),
            },
          },
        },
      }
    : {}),
});

export default config;
