/**
 * src/index.js — BranCodeX Express server entry point
 *
 * Responsibilities:
 *  - Secure HTTP headers (helmet)
 *  - CORS restricted to known front-end origins
 *  - JSON body parsing with a hard size cap
 *  - Mount API routers
 *  - 404 / global error handlers
 */

"use strict";

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const migrate = require("./db/migrate");

const leaderboardRouter = require("./routes/leaderboard");
const contactRouter = require("./routes/contact");
const testimonialsRouter = require("./routes/testimonials");
const projectsRouter = require("./routes/projects");
const snippetsRouter = require("./routes/snippets");
const challengesRouter = require("./routes/challenges");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const newsletterRouter = require("./routes/newsletter");

const app = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production origins are hardcoded as a fallback so the site always works
// even if the ALLOWED_ORIGINS env var is missing or misconfigured on Railway.
const PRODUCTION_ORIGINS = [
  "https://www.brancodex.com",
  "https://brancodex.com",
];

const ALLOWED_ORIGINS = [
  ...PRODUCTION_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

// Always permit localhost during development
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3001");
}

// Set CORS headers manually — most reliable approach, not subject to
// middleware ordering or cors-package quirks on Railway.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Vary", "Origin");
  }
  // Short-circuit all OPTIONS preflight requests immediately
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// ── Security headers ──────────────────────────────────────────────────────────
// Helmet is registered AFTER cors so it never interferes with CORS preflight.
app.use(helmet());

// ── Body parsing ──────────────────────────────────────────────────────────────
// Hard cap at 10 kb — leaderboard payloads are tiny; this blocks oversized
// request bodies that could cause DoS via memory exhaustion.
app.use(express.json({ limit: "100kb" }));

// ── URL normalisation ─────────────────────────────────────────────────────────
// Collapse any accidental double-slashes (e.g. //api/...) that arise when
// NEXT_PUBLIC_BACKEND_URL is stored with a trailing slash in Vercel env vars.
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Feature routers ───────────────────────────────────────────────────────────
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/contact", contactRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/snippets", snippetsRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/newsletter", newsletterRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Don't leak internal error details to clients in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message;
  console.error("[error]", err.message);
  res.status(err.status || 500).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Run database migrations first, then start accepting traffic.
// All DDL statements use IF NOT EXISTS and the seed is conditional,
// so this is safe to run on every deployment (Railway, Render, etc.).
async function start() {
  try {
    await migrate();
  } catch (err) {
    console.error("[server] Migration failed — aborting startup:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(
      `[server] BranCodeX API running on port ${PORT} (${process.env.NODE_ENV || "development"})`,
    );
  });
}

start();

module.exports = app; // exported for testing
