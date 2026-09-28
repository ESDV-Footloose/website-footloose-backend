import nodemailer, { Transporter } from "nodemailer";

/**
 * Cached promise for the Nodemailer transporter.
 */
let transporterPromise: Promise<Transporter> | undefined;

/**
 * Creates the Nodemailer transporter used to send emails.
 * When SMTP is available, the configured server is used.
 * Otherwise, an Ethereal test account is created for local development.
 *
 * @returns A configured Nodemailer transporter.
 */
async function buildTransporter(): Promise<Transporter> {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /** Use Ethereal when no SMTP server is configured so that local development does not require a mailbox. */
  const testAccount = await nodemailer.createTestAccount();
  strapi.log.warn(
    `[mailer] SMTP_HOST not set — using Ethereal test inbox (${testAccount.user})`,
  );

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * Returns the cached Nodemailer transporter (only initialized once).
 *
 * @returns A promise resolving to the configured Nodemailer transporter.
 */
export function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}
