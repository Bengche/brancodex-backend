"use strict";

/**
 * Verifies the Authorization: Bearer {token} header against ADMIN_SECRET.
 */
module.exports = function adminGuard(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
};
