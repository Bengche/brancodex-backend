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

// ── Shared email shell ────────────────────────────────────────────────────────
function shell(preheader, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>BranCodeX</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;
                    box-shadow:0 8px 40px rgba(79,70,229,0.13);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#312e81 100%);
                     padding:36px 40px 28px;text-align:center;">
            <div style="font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1;">
              <span style="color:#4f46e5;">Bran</span><span style="color:#fbbf24;">Code</span><span style="color:#ffffff;">X</span>
            </div>
            <div style="color:#94a3b8;font-size:12px;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">
              Web Development Agency
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${body}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="padding:0 40px;">
            <div style="height:1px;background:linear-gradient(90deg,#e0e7ff,#c7d2fe,#e0e7ff);"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:28px 40px 32px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0 0 10px;line-height:1.6;">
              &copy; 2026 BranCodeX &middot; Bamenda, Cameroon
            </p>
            <p style="margin:0 0 12px;">
              <a href="${SITE_URL}" style="color:#4f46e5;font-size:12px;text-decoration:none;font-weight:600;">
                www.brancodex.com
              </a>
            </p>
            <p style="margin:0;">
              <a href="${SITE_URL}" style="display:inline-block;margin:0 6px;">
                <span style="color:#64748b;font-size:12px;">Portfolio</span>
              </a>
              <span style="color:#e2e8f0;">&middot;</span>
              <a href="${SITE_URL}/blog" style="display:inline-block;margin:0 6px;">
                <span style="color:#64748b;font-size:12px;">Blog</span>
              </a>
              <span style="color:#e2e8f0;">&middot;</span>
              <a href="${SITE_URL}/contact" style="display:inline-block;margin:0 6px;">
                <span style="color:#64748b;font-size:12px;">Contact</span>
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
  return `<a href="${url}"
    style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
           color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;
           padding:14px 32px;border-radius:10px;letter-spacing:0.3px;
           box-shadow:0 4px 16px rgba(79,70,229,0.35);">
    ${label}
  </a>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">${text}</h1>`;
}

function p(text, extra = "") {
  return `<p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;${extra}">${text}</p>`;
}

function infoBox(rows) {
  const cells = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#64748b;
                 text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;
                 background:#f8fafc;border-bottom:1px solid #e2e8f0;width:30%;">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1e293b;
                 background:#ffffff;border-bottom:1px solid #e2e8f0;">${value}</td>
    </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin:20px 0 24px;">
    ${cells}
  </table>`;
}

// ── 1. Contact confirmation (to sender) ───────────────────────────────────────
function contactConfirmationHtml(name) {
  return shell(
    `We received your message, ${name}. We'll be in touch soon!`,
    `
    ${h1(`Thank you, ${name}! 👋`)}
    ${p(`Your message has been received and is now safely stored in our inbox.
         A member of the BranCodeX team will personally review it and get back
         to you within <strong style="color:#4f46e5;">24–48 hours</strong>.`)}
    ${p(`In the meantime, feel free to explore the portfolio, read our blog, or
         check out the interactive playground.`)}
    <div style="text-align:center;margin:28px 0;">
      ${btn("Visit BranCodeX", SITE_URL)}
    </div>
    ${p(`We look forward to building something amazing together.`, "font-size:14px;color:#64748b;")}
    `,
  );
}

// ── 2. Contact admin notification ─────────────────────────────────────────────
function contactNotificationHtml(name, email, message) {
  const safe = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return shell(
    `New contact message from ${name} (${email})`,
    `
    ${h1("New Contact Message")}
    ${p(`A visitor just submitted a message through the BranCodeX contact form.`)}
    ${infoBox([
      ["From", `<strong>${name}</strong>`],
      ["Email", `<a href="mailto:${email}" style="color:#4f46e5;text-decoration:none;">${email}</a>`],
      ["Received", new Date().toLocaleString("en-GB", { timeZone: "Africa/Douala" }) + " WAT"],
    ])}
    <div style="background:#f8fafc;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;
                padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;
                text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${safe}</p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      ${btn("Reply Now", `mailto:${email}`)}
    </div>
    `,
  );
}

// ── 3. Email verification ─────────────────────────────────────────────────────
function verificationEmailHtml(name, verifyUrl) {
  return shell(
    `Verify your BranCodeX account, ${name} — link expires in 24 hours`,
    `
    ${h1(`One step to go, ${name}!`)}
    ${p(`Welcome to BranCodeX. Please confirm your email address by clicking
         the button below. This link is valid for <strong style="color:#4f46e5;">24 hours</strong>.`)}
    <div style="text-align:center;margin:32px 0;">
      ${btn("Verify My Email", verifyUrl)}
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;
                padding:14px 18px;margin:24px 0 8px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        <strong>Can't click the button?</strong> Copy and paste this URL into your browser:<br/>
        <span style="word-break:break-all;color:#4f46e5;">${verifyUrl}</span>
      </p>
    </div>
    ${p(`If you did not create a BranCodeX account, you can safely ignore this email.`,
        "font-size:13px;color:#94a3b8;")}
    `,
  );
}

// ── 4. Welcome email (after verification) ─────────────────────────────────────
function welcomeEmailHtml(name) {
  return shell(
    `Your BranCodeX account is confirmed — welcome aboard, ${name}!`,
    `
    ${h1(`Welcome to BranCodeX, ${name}! 🎉`)}
    ${p(`Your email has been verified and your account is now fully active. You are
         officially part of the BranCodeX community.`)}

    <!-- Feature highlights -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 28px;">
      ${[
        ["🏆", "Global Leaderboards", "Compete with players worldwide in our Quiz and Guess &amp; Challenge games."],
        ["💻", "Live Code Editor", "Write and share HTML, CSS &amp; JS snippets in your browser — instantly."],
        ["📚", "Dev Blog", "Practical articles on web development, business, and Cameroonian tech."],
      ]
        .map(
          ([icon, title, desc]) => `
      <tr>
        <td style="padding:12px 0;vertical-align:top;" width="48">
          <div style="width:40px;height:40px;background:#ede9fe;border-radius:10px;
                      text-align:center;line-height:40px;font-size:20px;">${icon}</div>
        </td>
        <td style="padding:12px 0 12px 14px;vertical-align:top;">
          <strong style="font-size:14px;color:#0f172a;">${title}</strong><br/>
          <span style="font-size:13px;color:#64748b;line-height:1.5;">${desc}</span>
        </td>
      </tr>`,
        )
        .join("")}
    </table>

    <div style="text-align:center;margin:28px 0 8px;">
      ${btn("Explore BranCodeX", SITE_URL)}
    </div>
    ${p(`If you have any questions, simply reply to this email — we read every message.`,
        "font-size:13px;color:#94a3b8;text-align:center;")}
    `,
  );
}

// ── 5. Testimonial receipt (to submitter) ─────────────────────────────────────
function testimonialReceiptHtml(name) {
  return shell(
    `Your review is in — thank you, ${name}!`,
    `
    ${h1(`Thank you for your review, ${name}! ⭐`)}
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
  const stars = "⭐".repeat(rating);
  const safe = review.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return shell(
    `New ${rating}-star testimonial from ${name} — pending approval`,
    `
    ${h1("New Testimonial Pending Approval")}
    ${infoBox([
      ["Name", `<strong>${name}</strong>`],
      ["Rating", stars],
      ["Submitted", new Date().toLocaleString("en-GB", { timeZone: "Africa/Douala" }) + " WAT"],
    ])}
    <div style="background:#f8fafc;border-left:4px solid #fbbf24;border-radius:0 8px 8px 0;
                padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;
                text-transform:uppercase;letter-spacing:1px;">Review</p>
      <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${safe}</p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      ${btn("Go to Admin Dashboard", `${SITE_URL}/admin`)}
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
    send(to, "We received your message — BranCodeX", contactConfirmationHtml(name)),

  sendContactNotification: (name, email, message) =>
    send(ADMIN_EMAIL, `New message from ${name}`, contactNotificationHtml(name, email, message)),

  sendVerificationEmail: (to, name, verifyUrl) =>
    send(to, "Verify your BranCodeX account", verificationEmailHtml(name, verifyUrl)),

  sendWelcomeEmail: (to, name) =>
    send(to, `Welcome to BranCodeX, ${name}!`, welcomeEmailHtml(name)),

  sendTestimonialReceipt: (to, name) =>
    send(to, "Thank you for your review — BranCodeX", testimonialReceiptHtml(name)),

  sendTestimonialNotification: (name, review, rating) =>
    send(ADMIN_EMAIL, `New ${rating}-star testimonial from ${name}`, testimonialNotificationHtml(name, review, rating)),
};
