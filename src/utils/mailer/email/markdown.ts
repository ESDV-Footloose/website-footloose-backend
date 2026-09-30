import MarkdownIt from "markdown-it";

import { FOOTLOOSE_RED } from "./layout";

const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

md.renderer.rules.paragraph_open = (tokens, idx) => {
  // Paragraphs inside a callout box get tighter spacing.
  const margin = tokens[idx].level > 0 ? "0 0 8px" : "0 0 16px";
  return `<p style="margin: ${margin}; font-size: 15px;">`;
};

md.renderer.rules.heading_open = () =>
  `<h2 style="margin: 0 0 14px; font-size: 18px; line-height: 1.4; color: #222222;">`;
md.renderer.rules.heading_close = () => `</h2>`;

md.renderer.rules.blockquote_open = () =>
  `<div style="margin: 24px 0; padding: 14px 16px; border-left: 3px solid ${FOOTLOOSE_RED}; background-color: #fafafa;">`;
md.renderer.rules.blockquote_close = () => `</div>`;

md.renderer.rules.bullet_list_open = () =>
  `<ul style="margin: 0 0 16px; padding-left: 20px; font-size: 15px;">`;

md.renderer.rules.link_open = (tokens, idx) => {
  const href = md.utils.escapeHtml(tokens[idx].attrGet("href") ?? "");

  // A link that is the only content of its paragraph becomes a button.
  const isButton = idx === 0 && tokens.length === 3;

  return isButton
    ? `<a href="${href}" style="display: inline-block; padding: 11px 20px; border-radius: 5px; background-color: ${FOOTLOOSE_RED}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">`
    : `<a href="${href}" style="color: ${FOOTLOOSE_RED}; font-weight: 600; text-decoration: none;">`;
};

/**
 * Converts Markdown to HTML using inline styles suitable for email clients.
 *
 * @param markdown The Markdown source.
 * @returns The styled HTML.
 */
export const renderMarkdown = (markdown: string): string => md.render(markdown);
