const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Init database before anything else
const { initDb } = require('./db');
initDb();

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const sharingRoutes = require('./routes/sharing');
const uploadRoutes = require('./routes/upload');
const versionRoutes = require('./routes/versions');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow the frontend dev server
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'collabwrite-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true behind HTTPS in prod
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'lax',
  },
}));

// Create uploads dir if it doesn't exist (used for temp storage if needed)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents', sharingRoutes);   // sharing is scoped under documents
app.use('/api/documents', versionRoutes);   // versions too
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
}

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only listen when not imported as a module (e.g., in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CollabWrite server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
