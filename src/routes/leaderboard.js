/**
 * src/routes/leaderboard.js
 *
 * Routes:
 *   GET  /api/leaderboard/:game  — fetch top 10 for a game
 *   POST /api/leaderboard/:game  — submit a score { player, score }
 *
 * Valid game slugs: 'quiz' | 'guess-challenge'
 */

"use strict";

const express   = require("express");
const { body, param, validationResult } = require("express-validator");
const pool      = require("../db/pool");
const { readLimiter, writeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// ── Whitelist of accepted game slugs ─────────────────────────────────────────
const VALID_GAMES = new Set(["quiz", "guess-challenge"]);

const SCORE_CAPS = {
  quiz: 20,
  "guess-challenge": 12,
};

// ── Badge rules ───────────────────────────────────────────────────────────────
const BADGE_RULES = {
  quiz: [
    { min: 20, badge: "🏆 Perfectionist" },
    { min: 18, badge: "🧠 Genius" },
    { min: 15, badge: "📚 Scholar" },
    { min: 12, badge: "⭐ High Scorer" },
    { min: 10, badge: "🎓 Achiever" },
  ],
  "guess-challenge": [
    { min: 12, badge: "🌍 Geography Master" },
    { min: 10, badge: "🗺️ World Explorer" },
    { min: 8,  badge: "✈️ Globetrotter" },
    { min: 6,  badge: "🧭 Navigator" },
    { min: 3,  badge: "🌐 Traveler" },
  ],
};

function computeBadges(game, score) {
  return (BADGE_RULES[game] || [])
    .filter((r) => score >= r.min)
    .map((r) => r.badge);
}

// ── Validators ────────────────────────────────────────────────────────────────

const validateGame = param("game")
  .trim()
  .customSanitizer((v) => v.toLowerCase())
  .custom((v) => {
    if (!VALID_GAMES.has(v)) throw new Error("Unknown game.");
    return true;
  });

const validateSubmission = [
  validateGame,
  body("player")
    .trim()
    .notEmpty().withMessage("Player name is required.")
    .isLength({ max: 80 }).withMessage("Player name must be 80 characters or fewer.")
    .escape(), // HTML-encode any special chars to prevent stored XSS
  body("score")
    .isInt({ min: 0 }).withMessage("Score must be a non-negative integer.")
    .toInt()
    .custom((score, { req }) => {
      const cap = SCORE_CAPS[req.params.game];
      if (cap !== undefined && score > cap) {
        throw new Error(`Score exceeds the maximum for this game (${cap}).`);
      }
      return true;
    }),
];

// ── Helper: extract & send validation errors ──────────────────────────────────
function assertValid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return false;
  }
  return true;
}

// ── GET /api/leaderboard/:game ────────────────────────────────────────────────
/**
 * Returns the top 10 scores for the requested game, ordered by score DESC.
 * Each entry: { rank, player, score, played_at }
 */
router.get(
  "/:game",
  readLimiter,
  validateGame,
  async (req, res) => {
    if (!assertValid(req, res)) return;

    const { game } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT
           ROW_NUMBER() OVER (ORDER BY score DESC, played_at ASC) AS rank,
           player, score, badges, played_at
         FROM leaderboard_entries
         WHERE game = $1
         ORDER BY score DESC, played_at ASC
         LIMIT 10`,
        [game],
      );

      res.json({
        game,
        leaderboard: rows.map((r) => ({
          rank:      Number(r.rank),
          player:    r.player,
          score:     r.score,
          badges:    r.badges || [],
          played_at: r.played_at,
        })),
      });
    } catch (err) {
      console.error(`[leaderboard GET /${game}]`, err.message);
      res.status(500).json({ error: "Failed to retrieve leaderboard." });
    }
  },
);

// ── POST /api/leaderboard/:game ───────────────────────────────────────────────
/**
 * Accepts { player: string, score: number } and inserts a new entry.
 * Returns the updated top-10 leaderboard and whether the score made it in.
 */
router.post(
  "/:game",
  writeLimiter,
  validateSubmission,
  async (req, res) => {
    if (!assertValid(req, res)) return;

    const { game }          = req.params;
    const { player, score } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Compute badges server-side
      const badges = computeBadges(game, score);

      // Insert the new entry
      await client.query(
        `INSERT INTO leaderboard_entries (game, player, score, badges)
         VALUES ($1, $2, $3, $4)`,
        [game, player, score, badges],
      );

      // Fetch updated top 10
      const { rows } = await client.query(
        `SELECT
           ROW_NUMBER() OVER (ORDER BY score DESC, played_at ASC) AS rank,
           player, score, badges, played_at
         FROM leaderboard_entries
         WHERE game = $1
         ORDER BY score DESC, played_at ASC
         LIMIT 10`,
        [game],
      );

      await client.query("COMMIT");

      // Did this submission appear in the top 10?
      const madeIt = rows.some(
        (r) => r.player === player && r.score === score,
      );

      res.status(201).json({
        game,
        madeTopTen: madeIt,
        leaderboard: rows.map((r) => ({
          rank:      Number(r.rank),
          player:    r.player,
          score:     r.score,
          badges:    r.badges || [],
          played_at: r.played_at,
        })),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[leaderboard POST /${game}]`, err.message);
      res.status(500).json({ error: "Failed to submit score." });
    } finally {
      client.release();
    }
  },
);

module.exports = router;
