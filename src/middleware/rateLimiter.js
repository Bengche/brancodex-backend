/**
 * src/middleware/rateLimiter.js
 *
 * Two separate limiters:
 *  - readLimiter  — for GET requests (generous, read-only)
 *  - writeLimiter — for POST/score-submission (strict, prevents flooding)
 */

"use strict";

const rateLimit = require("express-rate-limit");

/** 200 reads per minute per IP — public leaderboard polling. */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/** 10 score submissions per 5 minutes per IP — anti-spam. */
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please wait before trying again." },
});

module.exports = { readLimiter, writeLimiter };
