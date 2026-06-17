"use strict";

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../db/pool");
const adminGuard = require("../middleware/adminGuard");

const bcrypt = require("bcryptjs");

const router = express.Router();

// ── Login (public — no adminGuard) ───────────────────────────────────────────
// POST /api/admin/login  { email, password }
// Returns the ADMIN_SECRET token so the frontend can use it for all other calls.
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL || "contact@brancodex.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (email.toLowerCase().trim() !== adminEmail.toLowerCase()) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // ADMIN_PASSWORD is stored as a bcrypt hash OR as plain text for first-run.
  // We support both: try bcrypt compare first, fall back to direct comparison.
  let valid = false;
  if (adminPassword.startsWith("$2")) {
    valid = await bcrypt.compare(password, adminPassword);
  } else {
    valid = password === adminPassword;
  }

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  return res.json({ token: process.env.ADMIN_SECRET });
});

// All routes below require the admin token
router.use(adminGuard);

// ── Health (token test) ──────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ ok: true }));

// ── Contacts ─────────────────────────────────────────────────────────────────
router.get("/contacts", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM contacts ORDER BY created_at DESC",
  );
  res.json(rows);
});

router.patch("/contacts/:id/read", async (req, res) => {
  await pool.query("UPDATE contacts SET read = TRUE WHERE id = $1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

// ── Testimonials ─────────────────────────────────────────────────────────────
router.get("/testimonials", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM testimonials ORDER BY created_at DESC",
  );
  res.json(rows);
});

router.patch(
  "/testimonials/:id",
  [body("status").isIn(["approved", "rejected", "pending"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    await pool.query("UPDATE testimonials SET status = $1 WHERE id = $2", [
      req.body.status,
      req.params.id,
    ]);
    res.json({ ok: true });
  },
);

// ── Availability ──────────────────────────────────────────────────────────────
router.get("/availability", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM availability WHERE id = 1");
  res.json(rows[0] || null);
});

router.patch(
  "/availability",
  [
    body("status").isIn(["available", "busy", "limited"]),
    body("message").trim().notEmpty().isLength({ max: 200 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    const { status, message } = req.body;
    await pool.query(
      `UPDATE availability SET status = $1, message = $2, updated_at = NOW()
       WHERE id = 1`,
      [status, message],
    );
    res.json({ ok: true });
  },
);

// ── Weekly challenges ─────────────────────────────────────────────────────────
router.get("/challenges", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM weekly_challenges ORDER BY week_start DESC",
  );
  res.json(rows);
});

router.post(
  "/challenges",
  [
    body("title").trim().notEmpty().isLength({ max: 200 }).escape(),
    body("description").trim().notEmpty().isLength({ max: 2000 }).escape(),
    body("type").isIn(["css", "js", "html", "puzzle"]),
    body("week_start").isDate(),
    body("starter_html").optional().isString().isLength({ max: 10000 }),
    body("starter_css").optional().isString().isLength({ max: 10000 }),
    body("starter_js").optional().isString().isLength({ max: 10000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });

    const {
      title,
      description,
      type,
      week_start,
      starter_html = "",
      starter_css = "",
      starter_js = "",
    } = req.body;
    // Deactivate any currently active challenge
    await pool.query(
      "UPDATE weekly_challenges SET active = FALSE WHERE active = TRUE",
    );
    const { rows } = await pool.query(
      `INSERT INTO weekly_challenges (title, description, type, starter_html, starter_css, starter_js, week_start, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (week_start) DO UPDATE
         SET title=$1, description=$2, type=$3, starter_html=$4,
             starter_css=$5, starter_js=$6, active=TRUE
       RETURNING *`,
      [
        title,
        description,
        type,
        starter_html,
        starter_css,
        starter_js,
        week_start,
      ],
    );
    res.status(201).json(rows[0]);
  },
);

router.patch("/challenges/:id/activate", async (req, res) => {
  await pool.query(
    "UPDATE weekly_challenges SET active = FALSE WHERE active = TRUE",
  );
  await pool.query("UPDATE weekly_challenges SET active = TRUE WHERE id = $1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
router.get("/leaderboard", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM leaderboard_entries ORDER BY game, score DESC",
  );
  res.json(rows);
});

router.delete("/leaderboard/:id", async (req, res) => {
  await pool.query("DELETE FROM leaderboard_entries WHERE id = $1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, verified, created_at FROM users ORDER BY created_at DESC",
  );
  res.json(rows);
});

// ── Newsletter subscribers ────────────────────────────────────────────────────
router.get("/newsletter", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, subscribed, created_at FROM newsletter_subscribers ORDER BY created_at DESC",
  );
  res.json(rows);
});

router.delete("/newsletter/:id", async (req, res) => {
  await pool.query("DELETE FROM newsletter_subscribers WHERE id = $1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

// POST /api/admin/newsletter/send — send bulk email to all active subscribers
// Body: { subject: string, body: string (HTML allowed) }
const mailer = require("../utils/mailer");

router.post(
  "/newsletter/send",
  [
    body("subject").trim().notEmpty().isLength({ max: 200 }).escape(),
    body("body").trim().notEmpty().isLength({ max: 50000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });

    const { subject, body: bodyContent } = req.body;

    try {
      const { rows } = await pool.query(
        "SELECT email, unsubscribe_token FROM newsletter_subscribers WHERE subscribed = TRUE",
      );

      if (!rows.length) return res.json({ ok: true, sent: 0 });

      // Send individually so each has a unique unsubscribe link
      const results = await Promise.allSettled(
        rows.map((sub) =>
          mailer.sendNewsletterBroadcast(
            sub.email,
            subject,
            bodyContent,
            sub.unsubscribe_token,
          ),
        ),
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      res.json({ ok: true, sent, failed });
    } catch (err) {
      console.error("[admin newsletter send]", err.message);
      res.status(500).json({ error: "Failed to send newsletter." });
    }
  },
);

module.exports = router;
