const express = require('express');
const { getDb } = require('../db');
const { requireDocAccess } = require('../middleware/auth');

const router = express.Router();

// POST /api/documents/:id/share
// Share a document with another user. Owner only.
router.post('/:id/share', requireDocAccess('owner'), (req, res) => {
  const db = getDb();
  const { username, permission } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const validPerms = ['viewer', 'editor'];
  if (!validPerms.includes(permission)) {
    return res.status(400).json({ error: `Permission must be one of: ${validPerms.join(', ')}` });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Can't share with yourself, that's just weird
  if (targetUser.id === req.session.userId) {
    return res.status(400).json({ error: "You can't share a document with yourself" });
  }

  // Upsert the share — if it already exists, update the permission
  // TODO: maybe notify the user somehow when they get a share?
  const existing = db.prepare(
    'SELECT * FROM document_shares WHERE document_id = ? AND user_id = ?'
  ).get(req.document.id, targetUser.id);

  if (existing) {
    db.prepare(
      'UPDATE document_shares SET permission = ? WHERE id = ?'
    ).run(permission, existing.id);
  } else {
    db.prepare(
      'INSERT INTO document_shares (document_id, user_id, permission) VALUES (?, ?, ?)'
    ).run(req.document.id, targetUser.id, permission);
  }

  const share = db.prepare(`
    SELECT ds.*, u.username, u.display_name
    FROM document_shares ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.document_id = ? AND ds.user_id = ?
  `).get(req.document.id, targetUser.id);

  res.status(201).json(share);
});

// GET /api/documents/:id/shares
// List all shares for a document. Anyone with access can see who else has access.
router.get('/:id/shares', requireDocAccess('viewer'), (req, res) => {
  const db = getDb();

  const shares = db.prepare(`
    SELECT ds.*, u.username, u.display_name
    FROM document_shares ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.document_id = ?
  `).all(req.document.id);

  res.json(shares);
});

// DELETE /api/documents/:id/share/:userId
// Revoke a share. Owner only.
router.delete('/:id/share/:userId', requireDocAccess('owner'), (req, res) => {
  const db = getDb();
  const targetUserId = parseInt(req.params.userId, 10);

  const result = db.prepare(
    'DELETE FROM document_shares WHERE document_id = ? AND user_id = ?'
  ).run(req.document.id, targetUserId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Share not found' });
  }

  res.json({ message: 'Share revoked' });
});

module.exports = router;
