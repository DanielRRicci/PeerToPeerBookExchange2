// middleware/auth.js
// Drop this file into your Express project at /middleware/auth.js
// Usage:  const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * requireAuth
 * Reads userId from the request body, query-string, or a simple session header.
 * Attaches the full user row to req.currentUser.
 *
 * Expects the frontend to send:  { userId: <id> }  in body  OR
 *                                 x-user-id: <id>  as a header.
 */
async function requireAuth(req, res, next) {
  try {
    const userId =
      req.body?.userId ||
      req.query?.userId ||
      req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    // ── swap this with however you query your DB ──────────────────────────────
    // e.g. using mysql2/promise pool already set up in your server.js
    const db = req.app.get('db');
    const [rows] = await db.query(
      'SELECT user_id, full_name, email, role, is_suspended FROM Users WHERE user_id = ?',
      [userId]
    );
    // ─────────────────────────────────────────────────────────────────────────

    if (!rows.length) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = rows[0];

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    console.error('[requireAuth]', err);
    res.status(500).json({ error: 'Auth check failed.' });
  }
}

/**
 * requireAdmin
 * Must be chained AFTER requireAuth.
 * Returns 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (req.currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };