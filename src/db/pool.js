/**
 * src/db/pool.js
 *
 * Singleton pg Pool.  All other modules import from here — never create
 * a second Pool or leave connections un-released.
 */

"use strict";

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // When DATABASE_URL is a TLS-enforced hosted Postgres (e.g. Supabase, Railway,
  // Render, Neon) set SSL to required.  Comment out or adjust as needed.
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,              // maximum pool connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[pg pool] unexpected idle client error:", err.message);
});

module.exports = pool;
