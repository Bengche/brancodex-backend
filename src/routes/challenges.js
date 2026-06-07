"use strict";

const express = require("express");
const pool    = require("../db/pool");
const { readLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/challenges/active — current week's challenge
router.get("/active", readLimiter, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, type,
              starter_html, starter_css, starter_js, week_start
         FROM weekly_challenges
        WHERE active = TRUE
        ORDER BY week_start DESC
        LIMIT 1`,
    );
    if (!rows.length) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    console.error("[challenges GET active]", err.message);
    res.status(500).json({ error: "Failed to load challenge." });
  }
});

module.exports = router;
