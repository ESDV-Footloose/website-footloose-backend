/**
 * Represents the rendered content of an email.
 */
interface EmailContent {
  /** The email subject. */
  subject: string;
  /** The email body as HTML. */
  html: string;
}

/**
 * Represents a single course displayed in a subscription email.
 */
export interface CourseListItem {
  /** The display name of the course, style + level. */
  courseName: string;
  /** Whether the member marked the course as a priority. */
  isPriority: boolean;
}

/**
 * Data required to fill in the course subscription confirmation email.
 */
export interface SubscriptionSavedData {
  /** The member's first name. */
  name: string;
  /** The courses included in the subscription. */
  courses: CourseListItem[];
}

/**
 * Data required to fill the account signup welcome email.
 */
export interface SignupWelcomeData {
  /** The member's first name. */
  name: string;
}

/**
 * Data required to fill the membership approval email.
 */
export interface AccountApprovedData {
  /** The member's first name. */
  name: string;
}

const FOOTLOOSE_RED = "#e41515";
const WEBSITE_URL = "https://esdvfootloose.nl";
const COURSE_ADMISSION_POLICY_URL =
  "https://esdvfootloose.nl/association-documents";

/**
 * Wraps the email content in the common Footloose email layout.
 *
 * @param title The title displayed at the top of the email.
 * @param bodyHtml The HTML content of the email body.
 * @returns A complete HTML email.
 */
const baseWrapper = (title: string, bodyHtml: string): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      font-family: Arial, Helvetica, sans-serif;
      color: #252525;
      line-height: 1.6;
    "
  >
    <div style="padding: 32px 16px;">
      <div
        style="
          max-width: 680px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
        "
      >

        <!-- Header -->
        <div
          style="
            padding: 28px 40px 24px;
            border-bottom: 3px solid ${FOOTLOOSE_RED};
          "
        >
          <a
            href="${WEBSITE_URL}"
            style="
              color: ${FOOTLOOSE_RED};
              text-decoration: none;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 0.5px;
            "
          >
            E.S.D.V. FOOTLOOSE
          </a>

          <div
            style="
              margin-top: 3px;
              font-size: 10px;
              color: #888888;
              letter-spacing: 1.5px;
            "
          >
            STUDENT DANCE ASSOCIATION
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 36px 40px 40px;">
          <h1
            style="
              margin: 0 0 26px;
              font-size: 26px;
              line-height: 1.3;
              font-weight: 700;
              color: #222222;
            "
          >
            ${title}
          </h1>

          ${bodyHtml}
        </div>

        <!-- Footer -->
        <div
          style="
            padding: 20px 40px;
            background-color: #fafafa;
            text-align: center;
          "
        >
          <p
            style="
              margin: 0 0 4px;
              font-size: 13px;
              color: #666666;
            "
          >
            <a
              href="${WEBSITE_URL}"
              style="
                color: ${FOOTLOOSE_RED};
                text-decoration: none;
                font-weight: 600;
              "
            >
              E.S.D.V. Footloose
            </a>
          </p>

          <p
            style="
              margin: 0;
              font-size: 11px;
              color: #999999;
            "
          >
            This is an automated message. Please do not reply to this email.
          </p>
        </div>

      </div>
    </div>
  </body>
</html>
`;

/**
 * Renders a list of courses for inclusion in the course subscription email.
 *
 * @param courses The courses to display.
 * @returns The HTML representation of the courses.
 */
const courseListHtml = (courses: CourseListItem[]): string => `
<div
  style="
    margin: 24px 0;
    border-left: 3px solid ${FOOTLOOSE_RED};
    background-color: #fafafa;
  "
>
  ${courses
    .map(
      ({ courseName, isPriority }, index) => `
        <div
          style="
            padding: 12px 16px;
            ${
              index < courses.length - 1
                ? "border-bottom: 1px solid #eeeeee;"
                : ""
            }
            font-size: 15px;
          "
        >
          <strong>${courseName}</strong>

          ${
            isPriority
              ? `
                <span
                  style="
                    display: inline-block;
                    margin-left: 8px;
                    padding: 2px 7px;
                    border-radius: 10px;
                    background-color: #fde8e8;
                    color: ${FOOTLOOSE_RED};
                    font-size: 11px;
                    font-weight: 600;
                  "
                >
                  Priority
                </span>
              `
              : ""
          }
        </div>
      `,
    )
    .join("")}
</div>
`;

/**
 * Renders a call-to-action button for an email.
 *
 * @param text The text displayed on the button.
 * @param url The destination URL.
 * @returns The HTML representation of the button.
 */
const buttonHtml = (text: string, url: string): string => `
<div style="margin: 28px 0 8px;">
  <a
    href="${url}"
    style="
      display: inline-block;
      padding: 11px 20px;
      border-radius: 5px;
      background-color: ${FOOTLOOSE_RED};
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    "
  >
    ${text}
  </a>
</div>
`;

/**
 * Collection of email templates. Currently includes:
 * 1. Course subscription received
 * 2. Welcome email (first signup)
 * 3. Account approved.
 */
export const templates = {
  /** Confirms that a member's course subscription was received. */
  subscriptionSaved: ({
    name,
    courses,
  }: SubscriptionSavedData): EmailContent => ({
    subject: "Your Footloose course subscription",
    html: baseWrapper(
      "Course subscription received",
      `
        <p style="margin: 0 0 16px; font-size: 15px;">
          Hi ${name},
        </p>

        <p style="margin: 0 0 16px; font-size: 15px;">
          Thank you for subscribing to dance courses at Footloose!
          We have successfully received your subscription. <strong>Please note: this is not yet a confirmation
            that you have been accepted into these courses.</strong>
        </p>

        <p style="margin: 0 0 12px; font-size: 15px;">
          Your current subscription includes:
        </p>

        ${courseListHtml(courses)}

        <p style="margin: 20px 0 16px; font-size: 15px;">
          If more people subscribe to a course than there are available
          places, our
          <a
            href="${COURSE_ADMISSION_POLICY_URL}"
            style="
              color: ${FOOTLOOSE_RED};
              font-weight: 600;
              text-decoration: none;
            "
          >
            course admission policy
          </a>
          will be applied.
        </p>

        <p style="margin: 0 0 16px; font-size: 15px;">
          Once the subscription period has ended, we will process all
          subscriptions and let you know whether you have been accepted
          into your selected courses.
        </p>

        <p style="margin: 0; font-size: 15px;">
          You can manage your subscriptions through your account on the
          Footloose website.
        </p>

        ${buttonHtml("Go to Footloose", WEBSITE_URL)}
      `,
    ),
  }),

  /** Welcomes a newly registered member, explains membership approval. */
  signupWelcome: ({ name }: SignupWelcomeData): EmailContent => ({
    subject: "Welcome to ESDV Footloose!",
    html: baseWrapper(
      "Welcome to Footloose!",
      `
        <p style="margin: 0 0 16px; font-size: 15px;">
          Hi ${name},
        </p>

        <p style="margin: 0 0 16px; font-size: 15px;">
          Thank you for signing up for E.S.D.V. Footloose!
        </p>

        <p style="margin: 0 0 16px; font-size: 15px;">
          Your account has been created successfully. Before you can
          access the member area, your application needs to be reviewed
          by the Footloose board.
        </p>

        <p style="margin: 0 0 16px; font-size: 15px;">
          Please allow us some time to process your application. Once
          your application has been reviewed, we will send you another
          email letting you know whether your membership has been
          approved.
        </p>

        <div
          style="
            margin: 24px 0;
            padding: 14px 16px;
            border-left: 3px solid ${FOOTLOOSE_RED};
            background-color: #fafafa;
          "
        >
          <p
            style="
              margin: 0;
              font-size: 14px;
              color: #444444;
            "
          >
            <strong>Signed up for a workshop?</strong><br />
            If you only signed up for a workshop and not for membership,
            you can ignore this email.
          </p>
        </div>

        <p style="margin: 0 0 16px; font-size: 15px;">
          If you do not receive an update after some time, please check
          your spam or junk mail folder.
        </p>

        <p style="margin: 0; font-size: 15px;">
          If you have any questions, feel free to contact us at
          <a
            href="mailto:info@esdvfootloose.nl"
            style="
              color: ${FOOTLOOSE_RED};
              font-weight: 600;
              text-decoration: none;
            "
          >
            info@esdvfootloose.nl
          </a>.
        </p>

        <p
          style="
            margin: 28px 0 0;
            font-size: 15px;
          "
        >
          We hope to see you on the dance floor!
        </p>
      `,
    ),
  }),

  /** Notifies a user that their membership application has been approved. */
  accountApproved: ({ name }: AccountApprovedData): EmailContent => ({
    subject: "Your Footloose membership has been approved!",
    html: baseWrapper(
      "Your membership has been approved!",
      `
      <p style="margin: 0 0 16px; font-size: 15px;">
        Hi ${name},
      </p>

      <p style="margin: 0 0 16px; font-size: 15px;">
        Good news! The Footloose board has reviewed your application
        and approved your membership.
      </p>

      <p style="margin: 0 0 16px; font-size: 15px;">
        You can now log in to the Footloose website using the
        credentials you chose when creating your account. From your
        account, you can access the member area and subscribe to our
        dance courses when subscriptions are open.
      </p>

      <div
        style="
          margin: 28px 0;
          padding: 20px;
          background-color: #fafafa;
          border-left: 3px solid ${FOOTLOOSE_RED};
        "
      >
        <h2
          style="
            margin: 0 0 14px;
            font-size: 18px;
            line-height: 1.4;
            color: #222222;
          "
        >
          Membership fee
        </h2>

        <p
          style="
            margin: 0 0 14px;
            font-size: 14px;
            color: #444444;
          "
        >
          The yearly membership fee is <strong>€40</strong>.
          If you become a member in February, you can pay the
          half-year membership fee of <strong>€30</strong>.
        </p>

        <p
          style="
            margin: 0;
            font-size: 14px;
            color: #444444;
          "
        >
          After the dance course subscription deadline, you will
          receive all payment information for your membership.
        </p>
      </div>
    `,
    ),
  }),
};

/**
 * Represents the names of all currently available email templates.
 */
export type TemplateName = keyof typeof templates;

/**
 * Maps each email template to the data required to fill it.
 */
export interface TemplateDataMap {
  /** Data required for course subscriptions. */
  subscriptionSaved: SubscriptionSavedData;
  /** Data required for the welcome email. */
  signupWelcome: SignupWelcomeData;
  /** Data required for the membership approval email. */
  accountApproved: AccountApprovedData;
}
