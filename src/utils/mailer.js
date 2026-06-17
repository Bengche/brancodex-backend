/**
 * src/utils/mailer.js
 *
 * SendGrid transactional email utility.
 * All emails are sent FROM: BRANCODEX <contact@brancodex.com>
 * All admin notifications go TO: contact@brancodex.com
 */

"use strict";

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = { name: "BRANCODEX", email: "contact@brancodex.com" };
const ADMIN_EMAIL = "contact@brancodex.com";
const SITE_URL = "https://www.brancodex.com";
const RAW_BACKEND_URL =
  process.env.BACKEND_PUBLIC_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://brancodex-backend-production.up.railway.app");
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, "");

const BRAND = {
  navy: "#0f172a",
  navySoft: "#132136",
  green: "#22c55e",
  greenDark: "#16a34a",
  slate: "#475569",
  slateLight: "#64748b",
  border: "#dce7df",
  bg: "#f3f7f4",
  card: "#ffffff",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWatNow() {
  return `${new Date().toLocaleString("en-GB", {
    timeZone: "Africa/Douala",
  })} WAT`;
}

// ── Shared email shell ────────────────────────────────────────────────────────
function shell(preheader, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>BranCodeX</title>
  <style>
    @media only screen and (max-width: 640px) {
      .bx-shell { padding: 20px 12px !important; }
      .bx-card { border-radius: 14px !important; }
      .bx-header { padding: 24px 20px 18px !important; }
      .bx-content { padding: 24px 20px !important; }
      .bx-footer { padding: 20px !important; }
      .bx-h1 { font-size: 22px !important; line-height: 1.3 !important; }
      .bx-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
      .bx-stack td {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .bx-stack td + td { padding-top: 8px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Tahoma,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bx-shell" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             class="bx-card"
             style="max-width:600px;width:100%;background:${BRAND.card};border-radius:18px;overflow:hidden;
                    box-shadow:0 8px 30px rgba(15,23,42,0.10);border:1px solid ${BRAND.border};">

        <!-- HEADER -->
        <tr>
          <td class="bx-header" style="background:linear-gradient(130deg,${BRAND.navy} 0%,${BRAND.navySoft} 72%,#102c20 100%);
                     padding:32px 36px 24px;text-align:center;">
            <div style="font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1;">
              <span style="color:${BRAND.green};">Bran</span><span style="color:#f8fafc;">Code</span><span style="color:${BRAND.green};">X</span>
            </div>
            <div style="color:#cbd5e1;font-size:12px;margin-top:6px;letter-spacing:1.6px;text-transform:uppercase;">
              Web Development Agency
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="bx-content" style="padding:34px 36px 26px;">
            ${body}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="padding:0 36px;">
            <div style="height:1px;background:linear-gradient(90deg,#e2e8f0,${BRAND.border},#e2e8f0);"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="bx-footer" style="padding:22px 36px 28px;text-align:center;">
            <p style="color:${BRAND.slateLight};font-size:12px;margin:0 0 8px;line-height:1.6;">
              &copy; 2026 BranCodeX &middot; Bamenda, Cameroon
            </p>
            <p style="margin:0 0 10px;">
              <a href="${SITE_URL}" style="color:${BRAND.greenDark};font-size:12px;text-decoration:none;font-weight:700;">
                www.brancodex.com
              </a>
            </p>
            <p style="margin:0;">
              <a href="${SITE_URL}" style="display:inline-block;margin:0 6px;">
                <span style="color:${BRAND.slateLight};font-size:12px;">Portfolio</span>
              </a>
              <span style="color:#cbd5e1;">&middot;</span>
              <a href="${SITE_URL}/blog" style="display:inline-block;margin:0 6px;">
                <span style="color:${BRAND.slateLight};font-size:12px;">Blog</span>
              </a>
              <span style="color:#cbd5e1;">&middot;</span>
              <a href="${SITE_URL}/contact" style="display:inline-block;margin:0 6px;">
                <span style="color:${BRAND.slateLight};font-size:12px;">Contact</span>
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label, url) {
  return `<a href="${escapeHtml(url)}" class="bx-btn"
    style="display:inline-block;background:linear-gradient(135deg,${BRAND.green},${BRAND.greenDark});
           color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;
           padding:14px 28px;border-radius:10px;letter-spacing:0.2px;
           box-shadow:0 5px 16px rgba(22,163,74,0.28);">
    ${escapeHtml(label)}
  </a>`;
}

function h1(text) {
  return `<h1 class="bx-h1" style="margin:0 0 12px;font-size:28px;font-weight:800;color:${BRAND.navy};line-height:1.2;">${text}</h1>`;
}

function p(text, extra = "") {
  return `<p style="margin:0 0 18px;font-size:15px;color:${BRAND.slate};line-height:1.7;${extra}">${text}</p>`;
}

function infoBox(rows) {
  const cells = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${BRAND.slateLight};
                 text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;
                 background:#f8fafc;border-bottom:1px solid ${BRAND.border};width:30%;">${escapeHtml(label)}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1e293b;
                 background:#ffffff;border-bottom:1px solid ${BRAND.border};">${value}</td>
    </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};margin:20px 0 24px;">
    ${cells}
  </table>`;
}

// ── 1. Contact confirmation (to sender) ───────────────────────────────────────
function contactConfirmationHtml(name) {
  const safeName = escapeHtml(name);
  return shell(
    `We received your message, ${safeName}. We'll be in touch soon.`,
    `
    ${h1(`Thank you, ${safeName}.`)}
    ${p(`Your message has been received and is now safely stored in our inbox.
         A member of the BranCodeX team will personally review it and get back
         to you within <strong style="color:${BRAND.greenDark};">24-48 hours</strong>.`)}
    ${p(`In the meantime, feel free to explore the portfolio, read our blog, or
         check out the interactive playground.`)}
    <div style="text-align:center;margin:28px 0;">
      ${btn("Visit BranCodeX", SITE_URL)}
    </div>
    ${p(`We look forward to building something valuable together.`, `font-size:14px;color:${BRAND.slateLight};`)}
    `,
  );
}

// ── 2. Contact admin notification ─────────────────────────────────────────────
function contactNotificationHtml(name, email, message) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);
  return shell(
    `New contact message from ${safeName} (${safeEmail})`,
    `
    ${h1("New Contact Message")}
    ${p(`A visitor just submitted a message through the BranCodeX contact form.`)}
    ${infoBox([
      ["From", `<strong>${safeName}</strong>`],
      [
        "Email",
        `<a href="mailto:${safeEmail}" style="color:${BRAND.greenDark};text-decoration:none;">${safeEmail}</a>`,
      ],
      ["Received", formatWatNow()],
    ])}
    <div style="background:#f8fafc;border-left:4px solid ${BRAND.greenDark};border-radius:0 8px 8px 0;
                padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;
                text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      ${btn("Reply Now", `mailto:${safeEmail}`)}
    </div>
    `,
  );
}

// ── 3. Email verification ─────────────────────────────────────────────────────
function verificationEmailHtml(name, verifyUrl) {
  const safeName = escapeHtml(name);
  const safeVerifyUrl = escapeHtml(verifyUrl);
  return shell(
    `Verify your BranCodeX account, ${safeName}. Link expires in 24 hours.`,
    `
    ${h1(`One step to go, ${safeName}.`)}
    ${p(`Welcome to BranCodeX. Please confirm your email address by clicking
         the button below. This link is valid for <strong style="color:${BRAND.greenDark};">24 hours</strong>.`)}
    <div style="text-align:center;margin:32px 0;">
      ${btn("Verify My Email", verifyUrl)}
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
                padding:14px 18px;margin:24px 0 8px;">
      <p style="margin:0;font-size:13px;color:#14532d;line-height:1.6;">
        <strong>Can't click the button?</strong> Copy and paste this URL into your browser:<br/>
        <span style="word-break:break-all;color:${BRAND.greenDark};">${safeVerifyUrl}</span>
      </p>
    </div>
    ${p(
      `If you did not create a BranCodeX account, you can safely ignore this email.`,
      "font-size:13px;color:#94a3b8;",
    )}
    `,
  );
}

// ── 4. Welcome email (after verification) ─────────────────────────────────────
function welcomeEmailHtml(name) {
  const safeName = escapeHtml(name);
  return shell(
    `Your BranCodeX account is confirmed. Welcome, ${safeName}.`,
    `
    ${h1(`Welcome to BranCodeX, ${safeName}.`)}
    ${p(`Your email has been verified and your account is now fully active. You are
         officially part of the BranCodeX community.`)}

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 28px;">
      ${[
        [
          "01",
          "Global Leaderboards",
          "Compete with players worldwide in our Quiz and Guess &amp; Challenge games.",
        ],
        [
          "02",
          "Live Code Editor",
          "Write and share HTML, CSS &amp; JS snippets in your browser — instantly.",
        ],
        [
          "03",
          "Dev Blog",
          "Practical articles on web development, business, and Cameroonian tech.",
        ],
      ]
        .map(
          ([index, title, desc]) => `
      <tr>
        <td style="padding:12px 0;vertical-align:top;" width="48">
          <div style="width:40px;height:40px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;
                      text-align:center;line-height:40px;font-size:14px;font-weight:700;color:${BRAND.greenDark};">${index}</div>
        </td>
        <td style="padding:12px 0 12px 14px;vertical-align:top;">
          <strong style="font-size:14px;color:${BRAND.navy};">${title}</strong><br/>
          <span style="font-size:13px;color:${BRAND.slateLight};line-height:1.5;">${desc}</span>
        </td>
      </tr>`,
        )
        .join("")}
    </table>

    <div style="text-align:center;margin:28px 0 8px;">
      ${btn("Explore BranCodeX", SITE_URL)}
    </div>
    ${p(
      `If you have any questions, simply reply to this email — we read every message.`,
      "font-size:13px;color:#94a3b8;text-align:center;",
    )}
    `,
  );
}

// ── 5. Testimonial receipt (to submitter) ─────────────────────────────────────
function testimonialReceiptHtml(name) {
  const safeName = escapeHtml(name);
  return shell(
    `Your review is in. Thank you, ${safeName}.`,
    `
    ${h1(`Thank you for your review, ${safeName}.`)}
    ${p(`Your testimonial has been received and is currently pending approval.
         Once reviewed, it will appear on the BranCodeX portfolio for the world to see.`)}
    ${p(`We truly appreciate you taking the time to share your experience. Honest
         feedback from clients like you helps us grow and serve others better.`)}
    <div style="text-align:center;margin:28px 0;">
      ${btn("View the Portfolio", SITE_URL)}
    </div>
    `,
  );
}

// ── 6. Testimonial admin notification ────────────────────────────────────────
function testimonialNotificationHtml(name, review, rating) {
  const safeName = escapeHtml(name);
  const safeReview = escapeHtml(review);
  const stars = "&#9733;".repeat(Math.max(1, Number(rating) || 1));
  return shell(
    `New ${escapeHtml(rating)}-star testimonial from ${safeName}. Pending approval.`,
    `
    ${h1("New Testimonial Pending Approval")}
    ${infoBox([
      ["Name", `<strong>${safeName}</strong>`],
      ["Rating", stars],
      ["Submitted", formatWatNow()],
    ])}
    <div style="background:#f8fafc;border-left:4px solid ${BRAND.greenDark};border-radius:0 8px 8px 0;
                padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;
                text-transform:uppercase;letter-spacing:1px;">Review</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${safeReview}</p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      ${btn("Go to Admin Dashboard", `${SITE_URL}/admin`)}
    </div>
    `,
  );
}

// ── 7. Newsletter subscription confirmation ───────────────────────────────────
function newsletterConfirmationHtml(unsubscribeToken) {
  const safeToken = encodeURIComponent(unsubscribeToken);
  const unsubUrl = `${BACKEND_URL}/api/newsletter/unsubscribe?token=${safeToken}`;
  return shell(
    "You're subscribed to BranCodeX updates!",
    `
    ${h1("You're in!")}
    ${p(`You have successfully subscribed to the <strong style="color:${BRAND.greenDark};">BranCodeX Newsletter</strong>.
         You'll be the first to know about new projects, blog posts, tips, and special offers.`)}
    <div style="text-align:center;margin:28px 0;">
      ${btn("Explore BranCodeX", SITE_URL)}
    </div>
    ${p(
      `If you didn't subscribe or wish to stop receiving emails, you can
         <a href="${unsubUrl}" style="color:${BRAND.greenDark};text-decoration:none;">unsubscribe here</a>.`,
      "font-size:13px;color:#94a3b8;",
    )}
    `,
  );
}

// ── 8. Bulk newsletter (from admin) ───────────────────────────────────────────
function newsletterBroadcastHtml(subject, bodyContent, unsubscribeToken) {
  const safeToken = encodeURIComponent(unsubscribeToken);
  const unsubUrl = `${BACKEND_URL}/api/newsletter/unsubscribe?token=${safeToken}`;
  // bodyContent is already HTML written by the admin
  return shell(
    escapeHtml(subject),
    `
    <div style="font-size:15px;color:${BRAND.slate};line-height:1.7;word-break:break-word;">
      ${bodyContent}
    </div>
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${BRAND.border};text-align:center;">
      ${p(
        `If you no longer wish to receive these emails, you can
           <a href="${unsubUrl}" style="color:${BRAND.greenDark};text-decoration:none;">unsubscribe here</a>.`,
        "font-size:12px;color:#94a3b8;",
      )}
    </div>
    `,
  );
}

// ── Send helpers ──────────────────────────────────────────────────────────────
async function send(to, subject, html) {
  await sgMail.send({ from: FROM, to, subject, html });
}

module.exports = {
  sendContactConfirmation: (to, name) =>
    send(
      to,
      "We received your message — BranCodeX",
      contactConfirmationHtml(name),
    ),

  sendContactNotification: (name, email, message) =>
    send(
      ADMIN_EMAIL,
      `New message from ${name}`,
      contactNotificationHtml(name, email, message),
    ),

  sendVerificationEmail: (to, name, verifyUrl) =>
    send(
      to,
      "Verify your BranCodeX account",
      verificationEmailHtml(name, verifyUrl),
    ),

  sendWelcomeEmail: (to, name) =>
    send(to, `Welcome to BranCodeX, ${name}.`, welcomeEmailHtml(name)),

  sendTestimonialReceipt: (to, name) =>
    send(
      to,
      "Thank you for your review — BranCodeX",
      testimonialReceiptHtml(name),
    ),

  sendTestimonialNotification: (name, review, rating) =>
    send(
      ADMIN_EMAIL,
      `New ${rating}-star testimonial from ${name}`,
      testimonialNotificationHtml(name, review, rating),
    ),

  sendNewsletterConfirmation: (to, unsubscribeToken) =>
    send(
      to,
      "You're subscribed to BranCodeX Newsletter",
      newsletterConfirmationHtml(unsubscribeToken),
    ),

  sendNewsletterBroadcast: (to, subject, bodyContent, unsubscribeToken) =>
    send(
      to,
      subject,
      newsletterBroadcastHtml(subject, bodyContent, unsubscribeToken),
    ),
};
