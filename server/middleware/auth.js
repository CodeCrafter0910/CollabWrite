const { getDb } = require('../db');

/**
 * Rejects requests from users who aren't logged in.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in' });
  }
  next();
}

/**
 * Factory that returns middleware checking document access.
 * 
 * @param {string} requiredPermission - minimum permission: 'viewer', 'editor', or 'owner'
 * 
 * Attaches req.document and req.accessLevel for downstream handlers.
 */
function requireDocAccess(requiredPermission = 'viewer') {
  const permissionRank = { viewer: 1, editor: 2, owner: 3 };

  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'You must be logged in' });
    }

    const db = getDb();
    const docId = req.params.id;
    const userId = req.session.userId;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Figure out what level of access this user has
    let accessLevel;
    if (doc.owner_id === userId) {
      accessLevel = 'owner';
    } else {
      const share = db.prepare(
        'SELECT permission FROM document_shares WHERE document_id = ? AND user_id = ?'
      ).get(docId, userId);

      if (!share) {
        return res.status(403).json({ error: 'You do not have access to this document' });
      }
      accessLevel = share.permission; // 'viewer' or 'editor'
    }

    // Check if user has enough permission
    if ((permissionRank[accessLevel] || 0) < (permissionRank[requiredPermission] || 0)) {
      return res.status(403).json({ error: `Requires ${requiredPermission} access` });
    }

    req.document = doc;
    req.accessLevel = accessLevel;
    next();
  };
}

module.exports = { requireAuth, requireDocAccess };
