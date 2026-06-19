const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// POST /api/auth/login
// Simple login — just provide a username, no password needed for this demo
router.post('/login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
