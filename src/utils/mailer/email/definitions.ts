import { CONTACT_EMAIL, WEBSITE_URL } from "./layout";

const COURSE_ADMISSION_POLICY_URL = `${WEBSITE_URL}/association-documents`;

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
 * Maps each email template to the data the calling code has to provide.
 */
export interface TemplateDataMap {
  signupWelcome: { name: string };
  accountApproved: { name: string };
  subscriptionSaved: { name: string; courses: CourseListItem[] };
  eventSubscribed: {
    name: string;
    eventName: string;
    slug: string;
    /** The pre-formatted event date and time. */
    date: string;
    location: string;
    /** The price this subscriber has to pay. */
    price: number;
    /** The event's short code, used to build the payment reference. */
    eventCode: string;
    /** The subscriber's Strapi user id, used as their member number. */
    memberId: number;
  };
  eventUnsubscribed: {
    name: string;
    eventName: string;
    slug: string;
    /** The pre-formatted event date and time. */
    date: string;
  };
}

export type TemplateName = keyof TemplateDataMap;

export interface TemplateDefinition<K extends TemplateName> {
  /** Default subject, used until the board edits it in Strapi. */
  subject: string;
  /** Default heading shown at the top of the email. */
  title: string;
  /** Default Markdown body. */
  body: string;
  /** Placeholder name -> description, shown to the board in Strapi. */
  variables: Record<string, string>;
  /** Turns the data from the calling code into the placeholder values. */
  context: (data: TemplateDataMap[K]) => Record<string, unknown>;
}

/** Placeholders available in every email. */
export const globalContext = {
  websiteUrl: WEBSITE_URL,
  contactEmail: CONTACT_EMAIL,
};

export const globalVariables: Record<string, string> = {
  websiteUrl: "Link to the website (use three braces in links)",
  contactEmail: "The contact email address",
};

const formatPrice = (price: number) =>
  price > 0 ? `€${price.toFixed(2)}` : "Free";

export const definitions: {
  [K in TemplateName]: TemplateDefinition<K>;
} = {
  signupWelcome: {
    subject: "Welcome to ESDV Footloose!",
    title: "Welcome to Footloose!",
    body: `Hi {{name}},

Thank you for signing up for E.S.D.V. Footloose!

Your account has been created successfully. Before you can access the member area, your application needs to be reviewed by the Footloose board.

Please allow us some time to process your application. Once your application has been reviewed, we will send you another email letting you know whether your membership has been approved.

> **Signed up for a workshop?**
> If you only signed up for a workshop and not for membership, you can ignore this email.

If you do not receive an update after some time, please check your spam or junk mail folder.

If you have any questions, feel free to contact us at [{{contactEmail}}](mailto:{{{contactEmail}}}).

We hope to see you on the dance floor!
`,
    variables: { name: "The member's first name" },
    context: ({ name }) => ({ name }),
  },

  accountApproved: {
    subject: "Your Footloose membership has been approved!",
    title: "Your membership has been approved!",
    body: `Hi {{name}},

Good news! The Footloose board has reviewed your application and approved your membership.

You can now log in to the Footloose website using the credentials you chose when creating your account. From your account, you can access the member area and subscribe to our dance courses when subscriptions are open.

> ## Membership fee
>
> The yearly membership fee is **€40**. If you become a member in February, you can pay the half-year membership fee of **€30**.
>
> After the dance course subscription deadline, you will receive all payment information for your membership.
`,
    variables: { name: "The member's first name" },
    context: ({ name }) => ({ name }),
  },

  subscriptionSaved: {
    subject: "Your Footloose course subscription",
    title: "Course subscription received",
    body: `Hi {{name}},

Thank you for subscribing to dance courses at Footloose! We have successfully received your subscription. **Please note: this is not yet a confirmation that you have been accepted into these courses.**

Your current subscription includes:

{{{courseList}}}

If more people subscribe to a course than there are available places, our [course admission policy]({{{courseAdmissionPolicyUrl}}}) will be applied.

Once the subscription period has ended, we will process all subscriptions and let you know whether you have been accepted into your selected courses.

You can manage your subscriptions through your account on the Footloose website.

[Go to Footloose]({{{websiteUrl}}})
`,
    variables: {
      name: "The member's first name",
      courseList: "Bullet list of the subscribed courses (use three braces)",
      courseAdmissionPolicyUrl: "Link to the admission policy (three braces)",
    },
    context: ({ name, courses }) => ({
      name,
      courseList: courses
        .map(
          ({ courseName, isPriority }) =>
            `- **${courseName}**${isPriority ? " (priority)" : ""}`,
        )
        .join("\n"),
      courseAdmissionPolicyUrl: COURSE_ADMISSION_POLICY_URL,
    }),
  },

  eventSubscribed: {
    subject: "You're subscribed: {{eventName}}",
    title: "Event subscription confirmed",
    body: `Hi {{name}},

You have successfully subscribed to **{{eventName}}**.

> **When:** {{date}}
> **Where:** {{location}}
> **Price:** {{price}}

{{#isPaid}}
> **Payment instructions**
> Please transfer **{{price}}** before the event to **NL00 XXXX 0000 0000 00** in the name of E.S.D.V. Footloose, using payment reference **{{paymentReference}}**.

{{/isPaid}}
You can view the event or unsubscribe (while the deregistration deadline has not passed) on the event page.

[View event]({{{eventUrl}}})
`,
    variables: {
      name: "The subscriber's first name",
      eventName: "The event name",
      date: "Event date and time",
      location: "Event location",
      price: "The price this person pays, e.g. €10.00 or Free",
      isPaid: "True if the price is above zero (for {{#isPaid}}…{{/isPaid}})",
      paymentReference: "Unique payment reference: event code + member number",
      eventUrl: "Link to the event page (three braces)",
    },
    context: ({
      name,
      eventName,
      slug,
      date,
      location,
      price,
      eventCode,
      memberId,
    }) => ({
      name,
      eventName,
      date,
      location,
      price: formatPrice(price),
      isPaid: price > 0,
      paymentReference: `${eventCode}${memberId}`,
      eventUrl: `${WEBSITE_URL}/events/${slug}`,
    }),
  },

  eventUnsubscribed: {
    subject: "Unsubscribed: {{eventName}}",
    title: "Event unsubscription confirmed",
    body: `Hi {{name}},

You have been unsubscribed from **{{eventName}}** ({{date}}).

If you have already paid for this event, please contact us at [{{contactEmail}}](mailto:{{{contactEmail}}}).

Changed your mind? You can subscribe again on the event page for as long as registration is open.

[View event]({{{eventUrl}}})
`,
    variables: {
      name: "The subscriber's first name",
      eventName: "The event name",
      date: "Event date and time",
      eventUrl: "Link to the event page (three braces)",
    },
    context: ({ name, eventName, slug, date }) => ({
      name,
      eventName,
      date,
      eventUrl: `${WEBSITE_URL}/events/${slug}`,
    }),
  },
};

export const templateNames = Object.keys(definitions) as TemplateName[];
