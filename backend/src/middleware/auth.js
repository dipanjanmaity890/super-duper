const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Protect routes — verifies JWT and attaches req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { rows } = await query(
      'SELECT id, username, email, avatar_initials, avatar_color, total_points, streak_count, is_admin FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — attaches req.user if valid token present, else continues.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  try {
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, username, avatar_initials, avatar_color, total_points FROM users WHERE id = $1',
      [decoded.id]
    );
    if (rows.length) req.user = rows[0];
  } catch {
    // silently ignore bad tokens for optional routes
  }
  next();
};

/**
 * Admin-only guard — must come after authenticate.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireAdmin };
