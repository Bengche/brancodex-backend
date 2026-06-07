"use strict";

const express = require("express");
const { body, validationResult } = require("express-validator");
const pool   = require("../db/pool");
const mailer = require("../utils/mailer");
const { writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const validate = [
  body("name").trim().notEmpty().isLength({ max: 120 }).escape(),
  body("email").trim().isEmail().normalizeEmail(),
  body("message").trim().notEmpty().isLength({ max: 5000 }).escape(),
];

// POST /api/contact
router.post("/", writeLimiter, validate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { name, email, message } = req.body;
  try {
    await pool.query(
      "INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)",
      [name, email, message],
    );

    // Fire emails concurrently — non-fatal if they fail
    Promise.all([
      mailer.sendContactConfirmation(email, name),
      mailer.sendContactNotification(name, email, message),
    ]).catch((err) => console.error("[contact email]", err.message));

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[contact POST]", err.message);
    res.status(500).json({ error: "Failed to submit message." });
  }
});

module.exports = router;
