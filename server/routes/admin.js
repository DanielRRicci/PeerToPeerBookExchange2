// routes/admin.js
// Mount in server.js:  app.use('/api/admin', require('./routes/admin'));
//
// All routes require:  x-user-id header (or userId in body/query)
// Admin-only routes additionally require role = 'admin'

const express = require('express');
const router  = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ─── helper: write a moderation log entry ────────────────────────────────────
async function logAction(db, { adminId, actionType, targetType, targetId, notes = null }) {
  await db.query(
    `INSERT INTO ModerationLog (admin_id, action_type, target_type, target_id, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [adminId, actionType, targetType, targetId, notes]
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LISTING STATUS ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/admin/listings/:id/status
 * Body: { status: 'Active'|'Pending'|'Sold'|'Removed'|'Under Review', userId, notes? }
 *
 * Sellers can toggle their OWN listing between Active ↔ Sold.
 * Admins can set any status on any listing.
 */
router.patch('/listings/:id/status', requireAuth, async (req, res) => {
  const db       = req.app.get('db');
  const listingId = Number(req.params.id);
  const { status, notes } = req.body;
  const user = req.currentUser;

  const VALID_STATUSES = ['Pending', 'Active', 'Sold', 'Removed', 'Under Review'];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    // Fetch the listing to check ownership
    const [rows] = await db.query(
      'SELECT listing_id, user_id, status FROM BookListings WHERE listing_id = ?',
      [listingId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Listing not found.' });

    const listing = rows[0];
    const isOwner = listing.user_id === user.user_id;
    const isAdmin = user.role === 'admin';

    // Non-admins can only touch their own listing and only between Active/Sold
    if (!isAdmin) {
      if (!isOwner) return res.status(403).json({ error: 'Not your listing.' });
      if (!['Active', 'Sold'].includes(status)) {
        return res.status(403).json({ error: 'You can only toggle between Active and Sold.' });
      }
    }

    await db.query('UPDATE BookListings SET status = ? WHERE listing_id = ?', [status, listingId]);

    // Log if admin action
    if (isAdmin) {
      await logAction(db, {
        adminId:    user.user_id,
        actionType: `set_listing_status_${status.toLowerCase().replace(' ', '_')}`,
        targetType: 'listing',
        targetId:   listingId,
        notes,
      });
    }

    res.json({ listing_id: listingId, status });
  } catch (err) {
    console.error('[PATCH listing status]', err);
    res.status(500).json({ error: 'Failed to update listing status.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY: LISTING MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/listings
 * Returns ALL listings with any status (including Pending / Under Review).
 * Supports ?status=Pending filter.
 */
router.get('/listings', requireAuth, requireAdmin, async (req, res) => {
  const db = req.app.get('db');
  const { status } = req.query;

  try {
    let sql    = `SELECT bl.*, u.full_name AS seller_name, u.email AS seller_email
                  FROM BookListings bl
                  JOIN Users u ON u.user_id = bl.user_id`;
    const args = [];

    if (status) {
      sql += ' WHERE bl.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY bl.created_at DESC';

    const [rows] = await db.query(sql, args);
    res.json(rows);
  } catch (err) {
    console.error('[GET admin listings]', err);
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
});

/**
 * POST /api/admin/listings/:id/approve
 * Approves a Pending listing → sets status to Active.
 */
router.post('/listings/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const db        = req.app.get('db');
  const listingId = Number(req.params.id);
  const user      = req.currentUser;

  try {
    const [rows] = await db.query('SELECT listing_id FROM BookListings WHERE listing_id = ?', [listingId]);
    if (!rows.length) return res.status(404).json({ error: 'Listing not found.' });

    await db.query("UPDATE BookListings SET status = 'Active' WHERE listing_id = ?", [listingId]);

    await logAction(db, {
      adminId:    user.user_id,
      actionType: 'approve_listing',
      targetType: 'listing',
      targetId:   listingId,
    });

    res.json({ listing_id: listingId, status: 'Active' });
  } catch (err) {
    console.error('[POST approve listing]', err);
    res.status(500).json({ error: 'Failed to approve listing.' });
  }
});

/**
 * DELETE /api/admin/listings/:id
 * Hard-removes a listing (admin only). Sets status to Removed.
 * Does NOT physically delete the row so the moderation log retains a reference.
 */
router.delete('/listings/:id', requireAuth, requireAdmin, async (req, res) => {
  const db        = req.app.get('db');
  const listingId = Number(req.params.id);
  const user      = req.currentUser;
  const { notes } = req.body;

  try {
    const [rows] = await db.query('SELECT listing_id FROM BookListings WHERE listing_id = ?', [listingId]);
    if (!rows.length) return res.status(404).json({ error: 'Listing not found.' });

    await db.query("UPDATE BookListings SET status = 'Removed' WHERE listing_id = ?", [listingId]);

    await logAction(db, {
      adminId:    user.user_id,
      actionType: 'remove_listing',
      targetType: 'listing',
      targetId:   listingId,
      notes,
    });

    res.json({ message: 'Listing removed.' });
  } catch (err) {
    console.error('[DELETE admin listing]', err);
    res.status(500).json({ error: 'Failed to remove listing.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY: USER MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * Returns all users with basic stats.
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const db = req.app.get('db');
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.role,
              u.is_suspended, u.suspended_at, u.suspended_reason,
              u.created_at,
              COUNT(bl.listing_id) AS listing_count
       FROM Users u
       LEFT JOIN BookListings bl ON bl.user_id = u.user_id
       GROUP BY u.user_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET admin users]', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Body: { reason?, notes? }
 */
router.post('/users/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
  const db     = req.app.get('db');
  const userId = Number(req.params.id);
  const admin  = req.currentUser;
  const { reason = '', notes } = req.body;

  if (userId === admin.user_id) {
    return res.status(400).json({ error: 'You cannot suspend yourself.' });
  }

  try {
    const [rows] = await db.query('SELECT user_id, role FROM Users WHERE user_id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    if (rows[0].role === 'admin') return res.status(400).json({ error: 'Cannot suspend another admin.' });

    await db.query(
      'UPDATE Users SET is_suspended = TRUE, suspended_at = NOW(), suspended_reason = ? WHERE user_id = ?',
      [reason, userId]
    );

    await logAction(db, {
      adminId:    admin.user_id,
      actionType: 'suspend_user',
      targetType: 'user',
      targetId:   userId,
      notes:      notes || reason,
    });

    res.json({ user_id: userId, is_suspended: true });
  } catch (err) {
    console.error('[POST suspend user]', err);
    res.status(500).json({ error: 'Failed to suspend user.' });
  }
});

/**
 * POST /api/admin/users/:id/unsuspend
 */
router.post('/users/:id/unsuspend', requireAuth, requireAdmin, async (req, res) => {
  const db     = req.app.get('db');
  const userId = Number(req.params.id);
  const admin  = req.currentUser;

  try {
    await db.query(
      'UPDATE Users SET is_suspended = FALSE, suspended_at = NULL, suspended_reason = NULL WHERE user_id = ?',
      [userId]
    );

    await logAction(db, {
      adminId:    admin.user_id,
      actionType: 'unsuspend_user',
      targetType: 'user',
      targetId:   userId,
    });

    res.json({ user_id: userId, is_suspended: false });
  } catch (err) {
    console.error('[POST unsuspend user]', err);
    res.status(500).json({ error: 'Failed to unsuspend user.' });
  }
});

/**
 * POST /api/admin/users/:id/make-admin
 * Promotes a student to admin role.
 */
router.post('/users/:id/make-admin', requireAuth, requireAdmin, async (req, res) => {
  const db     = req.app.get('db');
  const userId = Number(req.params.id);
  const admin  = req.currentUser;

  try {
    await db.query("UPDATE Users SET role = 'admin' WHERE user_id = ?", [userId]);

    await logAction(db, {
      adminId:    admin.user_id,
      actionType: 'promote_to_admin',
      targetType: 'user',
      targetId:   userId,
    });

    res.json({ user_id: userId, role: 'admin' });
  } catch (err) {
    console.error('[POST make-admin]', err);
    res.status(500).json({ error: 'Failed to promote user.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY: MODERATION LOG
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/moderation-log
 * Returns recent moderation actions with actor name.
 * Supports ?limit=50 (default 50, max 200).
 */
router.get('/moderation-log', requireAuth, requireAdmin, async (req, res) => {
  const db    = req.app.get('db');
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const [rows] = await db.query(
      `SELECT ml.*, u.full_name AS admin_name
       FROM ModerationLog ml
       JOIN Users u ON u.user_id = ml.admin_id
       ORDER BY ml.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET moderation log]', err);
    res.status(500).json({ error: 'Failed to fetch moderation log.' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY: DASHBOARD STATS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Returns aggregated counts for the dashboard.
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  const db = req.app.get('db');
  try {
    const [[listingStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_listings,
        SUM(status = 'Pending')      AS pending,
        SUM(status = 'Active')       AS active,
        SUM(status = 'Sold')         AS sold,
        SUM(status = 'Removed')      AS removed,
        SUM(status = 'Under Review') AS under_review
      FROM BookListings
    `);

    const [[userStats]] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(is_suspended = 1) AS suspended_count,
        SUM(role = 'admin')   AS admin_count,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS new_last_7d,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_last_30d
      FROM Users
    `);

    // New signups per day for the last 30 days
    const [signupTrend] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM Users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // New listings per day for the last 30 days
    const [listingTrend] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS count
      FROM BookListings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      listings:     listingStats,
      users:        userStats,
      signupTrend,
      listingTrend,
    });
  } catch (err) {
    console.error('[GET admin stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;