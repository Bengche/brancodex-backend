"use strict";

const express = require("express");
const { body, validationResult } = require("express-validator");
const pool   = require("../db/pool");
const mailer = require("../utils/mailer");
const { readLimiter, writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/testimonials — approved only (public)
router.get("/", readLimiter, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, review, rating, photo_url, created_at
         FROM testimonials
        WHERE status = 'approved'
        ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("[testimonials GET]", err.message);
    res.status(500).json({ error: "Failed to load testimonials." });
  }
});

// POST /api/testimonials — submit new (pending)
router.post(
  "/",
  writeLimiter,
  [
    body("name").trim().notEmpty().isLength({ max: 120 }).escape(),
    body("review").trim().notEmpty().isLength({ max: 2000 }).escape(),
    body("rating").isInt({ min: 1, max: 5 }).toInt(),
    body("photo_url").optional({ checkFalsy: true }).isURL().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, review, rating, photo_url } = req.body;
    try {
      await pool.query(
        `INSERT INTO testimonials (name, review, rating, photo_url)
         VALUES ($1, $2, $3, $4)`,
        [name, review, rating, photo_url || null],
      );

      // Non-fatal emails
      Promise.all([
        mailer.sendTestimonialReceipt(req.body.email || null, name).catch(() => {}),
        mailer.sendTestimonialNotification(name, review, rating),
      ]).catch((err) => console.error("[testimonial email]", err.message));

      res.status(201).json({ ok: true, message: "Testimonial submitted and pending approval." });
    } catch (err) {
      console.error("[testimonials POST]", err.message);
      res.status(500).json({ error: "Failed to submit testimonial." });
    }
  },
);

module.exports = router;
