"use strict";

const jwt = require("jsonwebtoken");

/**
 * Verifies the Authorization: Bearer {jwt} header.
 * Attaches decoded payload to req.user.
 */
module.exports = function authGuard(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Authentication required." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};
