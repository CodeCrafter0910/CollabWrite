const express = require('express');
const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const { marked } = require('marked');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Use memory storage — we just need the buffer, not the file on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.md', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

/**
 * Convert a plain text string into basic HTML paragraphs.
 * Nothing fancy, just wraps each line in a <p> tag.
 */
function txtToHtml(text) {
  const lines = text.split(/\r?\n/);
  return lines
    .filter(line => line.trim().length > 0)
    .map(line => `<p>${line}</p>`)
    .join('\n');
}

// POST /api/upload
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const baseName = path.basename(req.file.originalname, ext);
    let htmlContent = '';

    if (ext === '.txt') {
      const text = req.file.buffer.toString('utf-8');
      htmlContent = txtToHtml(text);
    } else if (ext === '.md') {
      const mdText = req.file.buffer.toString('utf-8');
      htmlContent = await marked(mdText);
    } else if (ext === '.docx') {
      const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
      htmlContent = result.value;
      // TODO: maybe log result.messages for debugging docx conversion issues
    }

    // Create the document
    const db = getDb();
    const insertResult = db.prepare(
      'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
    ).run(baseName, htmlContent, req.session.userId);

    // Initial version snapshot
    db.prepare(
      'INSERT INTO document_versions (document_id, title, content) VALUES (?, ?, ?)'
    ).run(insertResult.lastInsertRowid, baseName, htmlContent);

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?')
      .get(insertResult.lastInsertRowid);

    res.status(201).json(doc);
  } catch (err) {
    // Multer errors (file too big, wrong type, etc.)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 5MB.' });
    }
    if (err.message && err.message.startsWith('Unsupported file type')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

module.exports = router;
