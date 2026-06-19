const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireDocAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/documents
// Returns docs you own + docs shared with you, sorted by most recently updated
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;

  // Owned documents
  const ownedDocs = db.prepare(`
    SELECT d.*, u.username as owner_username, u.display_name as owner_display_name,
           'owner' as access_level
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    WHERE d.owner_id = ?
  `).all(userId);

  // Shared documents
  const sharedDocs = db.prepare(`
    SELECT d.*, u.username as owner_username, u.display_name as owner_display_name,
           ds.permission as access_level
    FROM documents d
    JOIN users u ON d.owner_id = u.id
    JOIN document_shares ds ON ds.document_id = d.id AND ds.user_id = ?
  `).all(userId);

  const allDocs = [...ownedDocs, ...sharedDocs];

  // Sort by updated_at descending
  allDocs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  res.json(allDocs);
});

// POST /api/documents
// Create a new document and an initial version snapshot
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const { title, content } = req.body;

  const docTitle = title || 'Untitled Document';
  const docContent = content || '';

  const result = db.prepare(
    'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
  ).run(docTitle, docContent, userId);

  // Create initial version (version 0)
  db.prepare(
    'INSERT INTO document_versions (document_id, title, content) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, docTitle, docContent);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

// GET /api/documents/:id
router.get('/:id', requireDocAccess('viewer'), (req, res) => {
  const db = getDb();
  const doc = req.document;

  // Grab owner info
  const owner = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?')
    .get(doc.owner_id);

  // Grab shares
  const shares = db.prepare(`
    SELECT ds.*, u.username, u.display_name
    FROM document_shares ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.document_id = ?
  `).all(doc.id);

  res.json({
    ...doc,
    owner,
    shares,
    accessLevel: req.accessLevel,
  });
});

// PUT /api/documents/:id
// Update title/content. Saves a version snapshot but throttled to one every 5 mins.
router.put('/:id', requireDocAccess('editor'), (req, res) => {
  const db = getDb();
  const doc = req.document;
  const { title, content } = req.body;

  const newTitle = title !== undefined ? title : doc.title;
  const newContent = content !== undefined ? content : doc.content;

  db.prepare(
    'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newTitle, newContent, doc.id);

  // Version snapshot — but only if it's been 5+ minutes since the last one
  const lastVersion = db.prepare(
    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(doc.id);

  let shouldSnapshot = true;
  if (lastVersion) {
    const lastTime = new Date(lastVersion.created_at).getTime();
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;
    if (now - lastTime < fiveMin) {
      shouldSnapshot = false;
    }
  }

  if (shouldSnapshot) {
    db.prepare(
      'INSERT INTO document_versions (document_id, title, content) VALUES (?, ?, ?)'
    ).run(doc.id, newTitle, newContent);
  }

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
  res.json(updated);
});

// DELETE /api/documents/:id
router.delete('/:id', requireDocAccess('owner'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.document.id);
  res.json({ message: 'Document deleted' });
});

module.exports = router;
