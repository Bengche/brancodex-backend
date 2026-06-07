"use strict";

const express = require("express");
const { param, validationResult } = require("express-validator");
const pool = require("../db/pool");
const { readLimiter, writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const VALID_SLUGS = new Set(["njimbong", "fonlok", "jobvibe", "country", "school"]);

const validateSlug = param("slug")
  .trim()
  .custom((v) => {
    if (!VALID_SLUGS.has(v)) throw new Error("Unknown project slug.");
    return true;
  });

// GET /api/projects/:slug/views
router.get("/:slug/views", readLimiter, validateSlug, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { slug } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT views FROM project_views WHERE slug = $1",
      [slug],
    );
    res.json({ slug, views: rows[0]?.views ?? 0 });
  } catch (err) {
    console.error("[projects GET views]", err.message);
    res.status(500).json({ error: "Failed to get view count." });
  }
});

// POST /api/projects/:slug/view — increment (debounced on client via localStorage)
router.post("/:slug/view", writeLimiter, validateSlug, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { slug } = req.params;
  try {
    const { rows } = await pool.query(
      `INSERT INTO project_views (slug, views, updated_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (slug) DO UPDATE
         SET views = project_views.views + 1, updated_at = NOW()
       RETURNING views`,
      [slug],
    );
    res.status(200).json({ slug, views: rows[0].views });
  } catch (err) {
    console.error("[projects POST view]", err.message);
    res.status(500).json({ error: "Failed to record view." });
  }
});

module.exports = router;
