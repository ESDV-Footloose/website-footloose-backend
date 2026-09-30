import Mustache from "mustache";

import { baseWrapper } from "./layout";
import { renderMarkdown } from "./markdown";
import {
  definitions,
  globalContext,
  globalVariables,
  templateNames,
  type TemplateDataMap,
  type TemplateName,
} from "./definitions";

const TEMPLATE_UID = "api::email-template.email-template" as const;

/**
 * Represents the rendered content of an email.
 */
export interface EmailContent {
  /** The email subject. */
  subject: string;
  /** The email body as HTML. */
  html: string;
}

/**
 * Represents general email content.
 */
type TemplateSource = {
  /** The email subject. */
  subject: string;
  /** The email title. */
  title: string;
  /** The email body. */
  body: string;
};

/**
 * Represents stored email templates.
 */
type StoredTemplate = {
  /** DocumentID of the template in Strapi. */
  documentId: string;
  /** The unique name of the template. */
  key: TemplateName;
  /** The email subject. */
  subject: string | null;
  /** The email title. */
  title: string | null;
  /** The email body. */
  body: string | null;
  /** Variables available to use in the email. */
  availableVariables: string | null;
};

/** Finds a stored email template by document id, or none if it does not exist. */
const findStored = async (key: TemplateName) =>
  (await strapi
    .documents(TEMPLATE_UID)
    .findFirst({ filters: { key } })) as unknown as StoredTemplate | null;

/**
 * Renders a template source with the given placeholder values.
 * Values are HTML-escaped, except in the subject, which is plain text.
 */
const compile = (
  source: TemplateSource,
  view: Record<string, unknown>,
): EmailContent => ({
  subject: Mustache.render(
    source.subject,
    view,
    {},
    {
      escape: (value: string) => value,
    },
  ),
  html: baseWrapper(
    Mustache.render(source.title, view),
    renderMarkdown(Mustache.render(source.body, view)),
  ),
});

/**
 * Renders an email, using the version edited in Strapi when available and
 * the default from code otherwise (in case of missing entry, empty field or broken syntax).
 *
 * @param name The template to render.
 * @param data The data required by that template.
 * @returns The subject and HTML of the email.
 */
export async function renderTemplate<K extends TemplateName>(
  name: K,
  data: TemplateDataMap[K],
): Promise<EmailContent> {
  const definition = definitions[name];
  const view = { ...globalContext, ...definition.context(data) };
  const defaults: TemplateSource = {
    subject: definition.subject,
    title: definition.title,
    body: definition.body,
  };

  try {
    const stored = await findStored(name);
    return compile(
      {
        subject: stored?.subject || defaults.subject,
        title: stored?.title || defaults.title,
        body: stored?.body || defaults.body,
      },
      view,
    );
  } catch (err) {
    strapi.log.error(
      `Email template "${name}" could not be rendered, using the default: ${err}`,
    );
    return compile(defaults, view);
  }
}

const describeVariables = (variables: Record<string, string>): string =>
  [
    "REFERENCE ONLY. Changes to this field are overwritten on restart.",
    "",
    ...Object.entries({ ...globalVariables, ...variables }).map(
      ([variable, description]) => `{{${variable}}}  ${description}`,
    ),
    "",
    "Use {{{variable}}} (three braces) for links.",
    "Use {{#variable}}text{{/variable}} to show text only when it is true,",
    "and {{^variable}}text{{/variable}} to show it only when it is not.",
  ].join("\n");

/**
 * Creates the email templates that do not exist yet in Strapi (from the
 * defaults in code) and keeps the variable reference up to date.
 */
export async function syncEmailTemplates(): Promise<void> {
  for (const key of templateNames) {
    const definition = definitions[key];
    const availableVariables = describeVariables(definition.variables);
    const existing = await findStored(key);

    if (!existing) {
      await strapi.documents(TEMPLATE_UID).create({
        data: {
          key,
          subject: definition.subject,
          title: definition.title,
          body: definition.body,
          availableVariables,
        },
      });
    } else if (existing.availableVariables !== availableVariables) {
      await strapi.documents(TEMPLATE_UID).update({
        documentId: existing.documentId,
        data: { availableVariables },
      });
    }
  }
}
