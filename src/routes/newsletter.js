"use strict";

const crypto = require("crypto");
const express = require("express");
const { body, query, validationResult } = require("express-validator");
const pool = require("../db/pool");
const mailer = require("../utils/mailer");
const { writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// ── POST /api/newsletter/subscribe ────────────────────────────────────────────
router.post(
  "/subscribe",
  writeLimiter,
  [body("email").trim().isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(422)
        .json({ error: "Please enter a valid email address." });
    }

    const { email } = req.body;
    const token = crypto.randomBytes(32).toString("hex");

    try {
      // Upsert: if already subscribed return silently; if previously unsubscribed, re-enable
      const existing = await pool.query(
        "SELECT id, subscribed FROM newsletter_subscribers WHERE email = $1",
        [email],
      );

      if (existing.rows.length) {
        if (existing.rows[0].subscribed) {
          // Already active — don't reveal that to avoid enumeration
          return res.json({ ok: true });
        }
        // Was unsubscribed — re-subscribe
        await pool.query(
          "UPDATE newsletter_subscribers SET subscribed = TRUE WHERE email = $1",
          [email],
        );
      } else {
        await pool.query(
          "INSERT INTO newsletter_subscribers (email, unsubscribe_token) VALUES ($1, $2)",
          [email, token],
        );
      }

      mailer
        .sendNewsletterConfirmation(email, token)
        .catch((err) =>
          console.error("[newsletter subscribe email]", err.message),
        );

      res.json({ ok: true });
    } catch (err) {
      console.error("[newsletter subscribe]", err.message);
      res.status(500).json({ error: "Subscription failed. Please try again." });
    }
  },
);

// ── GET /api/newsletter/unsubscribe?token=xxx ─────────────────────────────────
router.get(
  "/unsubscribe",
  [query("token").isString().isLength({ min: 64, max: 64 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid unsubscribe token." });
    }

    try {
      const { rowCount } = await pool.query(
        "UPDATE newsletter_subscribers SET subscribed = FALSE WHERE unsubscribe_token = $1 AND subscribed = TRUE",
        [req.query.token],
      );

      if (!rowCount) {
        return res
          .status(404)
          .json({ error: "Token not found or already unsubscribed." });
      }

      res.json({ ok: true, message: "You have been unsubscribed." });
    } catch (err) {
      console.error("[newsletter unsubscribe]", err.message);
      res.status(500).json({ error: "Unsubscribe failed. Please try again." });
    }
  },
);

module.exports = router;
