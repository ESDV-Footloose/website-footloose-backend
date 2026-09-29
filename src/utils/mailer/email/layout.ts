export const FOOTLOOSE_RED = "#e41515";
export const WEBSITE_URL = "https://esdvfootloose.nl";
export const CONTACT_EMAIL = "info@esdvfootloose.nl";

/**
 * Wraps the email content in the common Footloose email layout.
 *
 * @param title The title displayed at the top of the email.
 * @param bodyHtml The HTML content of the email body.
 * @returns A complete HTML email.
 */
export const baseWrapper = (title: string, bodyHtml: string): string => `
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
