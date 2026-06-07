"use strict";

const crypto  = require("crypto");
const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool    = require("../db/pool");
const mailer  = require("../utils/mailer");
const { writeLimiter, readLimiter } = require("../middleware/rateLimiter");
const authGuard = require("../middleware/authGuard");

const router = express.Router();
const SITE_URL = "https://www.brancodex.com";
const TOKEN_TTL_HOURS = 24;

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post(
  "/register",
  writeLimiter,
  [
    body("name").trim().notEmpty().isLength({ max: 120 }).escape(),
    body("email").trim().isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
      .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter.")
      .matches(/[0-9]/).withMessage("Password must contain a number."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    try {
      // Check duplicate
      const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      const password_hash    = await bcrypt.hash(password, 12);
      const verify_token     = crypto.randomBytes(32).toString("hex");
      const token_expires_at = new Date(Date.now() + TOKEN_TTL_HOURS * 3_600_000);

      await pool.query(
        `INSERT INTO users (name, email, password_hash, verify_token, token_expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, password_hash, verify_token, token_expires_at],
      );

      const verifyUrl = `${SITE_URL}/auth/verify?token=${verify_token}`;
      mailer.sendVerificationEmail(email, name, verifyUrl).catch((err) =>
        console.error("[auth register email]", err.message),
      );

      res.status(201).json({ ok: true, message: "Account created. Please check your email to verify." });
    } catch (err) {
      console.error("[auth register]", err.message);
      res.status(500).json({ error: "Registration failed." });
    }
  },
);

// ── GET /api/auth/verify?token=xxx ────────────────────────────────────────────
router.get("/verify", readLimiter, async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string" || token.length !== 64) {
    return res.status(400).json({ error: "Invalid verification token." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET verified = TRUE, verify_token = NULL, token_expires_at = NULL
        WHERE verify_token = $1
          AND verified = FALSE
          AND token_expires_at > NOW()
        RETURNING id, name, email`,
      [token],
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Token is invalid or has expired." });
    }

    const { name, email } = rows[0];
    mailer.sendWelcomeEmail(email, name).catch((err) =>
      console.error("[auth verify welcome email]", err.message),
    );

    res.json({ ok: true, message: "Email verified successfully. Welcome to BranCodeX!" });
  } catch (err) {
    console.error("[auth verify]", err.message);
    res.status(500).json({ error: "Verification failed." });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post(
  "/login",
  writeLimiter,
  [
    body("email").trim().isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const { rows } = await pool.query(
        "SELECT id, name, email, password_hash, verified FROM users WHERE email = $1",
        [email],
      );

      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      if (!user.verified) {
        return res.status(403).json({ error: "Please verify your email before logging in." });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "30d" },
      );

      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("[auth login]", err.message);
      res.status(500).json({ error: "Login failed." });
    }
  },
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", readLimiter, authGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "User not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("[auth me]", err.message);
    res.status(500).json({ error: "Failed to load user." });
  }
});

module.exports = router;
