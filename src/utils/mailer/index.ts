import nodemailer from "nodemailer";
import { getTransporter } from "./transporter";
import { templates, TemplateName, TemplateDataMap } from "./templates";

/**
 * Sends an email using one of the predefined templates.
 * Email failures are logged rather than thrown so a delivery problem does not interrupt the operation.
 *
 * @param templateName The name of the email template being sent.
 * @param to The recipient's email address
 * @param data The data required by the selected template.
 */
export async function sendTemplateEmail<T extends TemplateName>(
  templateName: T,
  to: string | undefined,
  data: TemplateDataMap[T],
): Promise<void> {
  if (!to) return;

  const build = templates[templateName] as (d: TemplateDataMap[T]) => {
    subject: string;
    html: string;
  };
  const { subject, html } = build(data);

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });

    /**
     * Ethereal provides a preview URL when used or testing.
     * Production SMTP transports return no preview URL.
     */
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      strapi.log.info(`[mailer] "${templateName}" preview: ${previewUrl}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    strapi.log.error(
      `[mailer] failed to send "${templateName}" to ${to}: ${message}`,
    );
  }
}
