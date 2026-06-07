"use strict";

const crypto  = require("crypto");
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../db/pool");
const { readLimiter, writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

function genId() {
  return crypto.randomBytes(4).toString("hex"); // 8-char hex
}

// POST /api/snippets — save a snippet, return its id
router.post(
  "/",
  writeLimiter,
  [
    body("html").optional().isString().isLength({ max: 50_000 }),
    body("css").optional().isString().isLength({ max: 50_000 }),
    body("js").optional().isString().isLength({ max: 50_000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { html = "", css = "", js = "" } = req.body;
    if (!html && !css && !js)
      return res.status(422).json({ error: "At least one of html, css, js must be non-empty." });

    // Retry on ID collision (extremely unlikely)
    let id, tries = 0;
    while (tries < 5) {
      id = genId();
      const exists = await pool.query("SELECT 1 FROM snippets WHERE id = $1", [id]);
      if (!exists.rows.length) break;
      tries++;
    }

    try {
      await pool.query(
        "INSERT INTO snippets (id, html, css, js) VALUES ($1, $2, $3, $4)",
        [id, html, css, js],
      );
      res.status(201).json({ id, url: `https://www.brancodex.com/playground/s/${id}` });
    } catch (err) {
      console.error("[snippets POST]", err.message);
      res.status(500).json({ error: "Failed to save snippet." });
    }
  },
);

// GET /api/snippets/:id — retrieve a snippet
router.get("/:id", readLimiter, param("id").trim().isLength({ min: 8, max: 8 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { rows } = await pool.query(
      "UPDATE snippets SET views = views + 1 WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Snippet not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("[snippets GET]", err.message);
    res.status(500).json({ error: "Failed to load snippet." });
  }
});

module.exports = router;
