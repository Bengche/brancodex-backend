"use strict";

const express = require("express");
const pool    = require("../db/pool");
const { readLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/challenges/active — returns the challenge whose week_start is on or
// before today, picking the most recent one. No manual toggling needed: just
// insert a row with next Monday's week_start and it goes live automatically.
router.get("/active", readLimiter, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, type,
              starter_html, starter_css, starter_js, week_start
         FROM weekly_challenges
        WHERE week_start <= CURRENT_DATE
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
