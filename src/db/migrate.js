/**
 * src/db/migrate.js
 *
 * Applies schema.sql against the configured PostgreSQL database.
 *
 * Two usage modes:
 *   1. Called automatically by src/index.js on every server start
 *      (all DDL is idempotent — IF NOT EXISTS / conditional seed).
 *   2. Run standalone:  node src/db/migrate.js  or  npm run migrate
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const pool = require("./pool");

/**
 * Exported function — used by the server entry point.
 * Does NOT call pool.end() so the pool stays alive for subsequent requests.
 */
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("[migrate] Schema applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    // Re-throw so the caller (index.js) can decide whether to abort.
    throw err;
  } finally {
    client.release();
  }
}

module.exports = migrate;

// ── Standalone CLI entry point ────────────────────────────────────────────────
// Only runs when this file is executed directly (npm run migrate).
if (require.main === module) {
  require("dotenv").config();
  migrate()
    .catch((err) => {
      console.error("[migrate] Failed:", err.message);
      process.exit(1);
    })
    .finally(() => pool.end());
}
