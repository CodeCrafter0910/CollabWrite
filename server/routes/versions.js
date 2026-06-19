const express = require('express');
const { getDb } = require('../db');
const { requireDocAccess } = require('../middleware/auth');

const router = express.Router();

// GET /api/documents/:id/versions
// List version history, most recent first. Capped at 50.
router.get('/:id/versions', requireDocAccess('viewer'), (req, res) => {
  const db = getDb();

  const versions = db.prepare(`
    SELECT * FROM document_versions
    WHERE document_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.document.id);

  res.json(versions);
});

// POST /api/documents/:id/restore/:versionId
// Restore a previous version. Copies content back and creates a new snapshot.
router.post('/:id/restore/:versionId', requireDocAccess('editor'), (req, res) => {
  const db = getDb();
  const versionId = parseInt(req.params.versionId, 10);

  const version = db.prepare(
    'SELECT * FROM document_versions WHERE id = ? AND document_id = ?'
  ).get(versionId, req.document.id);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Restore the document to this version's state
  db.prepare(
    'UPDATE documents SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(version.title, version.content, req.document.id);

  // Also create a new version snapshot so we have a record of the restore
  db.prepare(
    'INSERT INTO document_versions (document_id, title, content) VALUES (?, ?, ?)'
  ).run(req.document.id, version.title, version.content);

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.document.id);
  res.json(updated);
});

module.exports = router;
