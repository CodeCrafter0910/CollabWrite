const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'collabwrite_db.json');

// In-memory state
let state = {
  users: [],
  documents: [],
  document_shares: [],
  document_versions: []
};

// Auto-increment IDs
let nextIds = {
  users: 1,
  documents: 1,
  document_shares: 1,
  document_versions: 1
};

// Check if running in test mode
const isTest = process.env.NODE_ENV === 'test';

function loadDb() {
  if (isTest) return; // tests run fully in-memory
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      
      // Sync nextIds
      Object.keys(nextIds).forEach(table => {
        if (state[table] && state[table].length > 0) {
          nextIds[table] = Math.max(...state[table].map(item => item.id || 0)) + 1;
        }
      });
    } catch (e) {
      console.error('Failed to load DB file, starting clean:', e);
    }
  }
}

function saveDb() {
  if (isTest) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save DB file:', e);
  }
}

class Statement {
  constructor(sql) {
    this.sql = sql.trim().replace(/\s+/g, ' ');
  }

  run(...params) {
    let result = { lastInsertRowid: 0, changes: 0 };
    const sql = this.sql;

    // 1. INSERT OR IGNORE INTO users OR INSERT INTO users
    if (sql.includes('INSERT INTO users') || sql.includes('INSERT OR IGNORE INTO users')) {
      const [username, display_name] = params;
      const existing = state.users.find(u => u.username === username);
      if (!existing) {
        const newId = nextIds.users++;
        state.users.push({
          id: newId,
          username,
          display_name,
          created_at: new Date().toISOString()
        });
        result.lastInsertRowid = newId;
        result.changes = 1;
        saveDb();
      }
    }
    // 2. INSERT INTO documents
    else if (sql.includes('INSERT INTO documents')) {
      const [title, content, owner_id] = params;
      const newId = nextIds.documents++;
      state.documents.push({
        id: newId,
        title: title || 'Untitled Document',
        content: content || '',
        owner_id: Number(owner_id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      result.lastInsertRowid = newId;
      result.changes = 1;
      saveDb();
    }
    // 3. INSERT INTO document_versions
    else if (sql.includes('INSERT INTO document_versions')) {
      const [document_id, title, content, created_at_param] = params;
      const newId = nextIds.document_versions++;
      const createdAt = created_at_param || new Date().toISOString();
      state.document_versions.push({
        id: newId,
        document_id: Number(document_id),
        title,
        content,
        created_at: createdAt
      });
      result.lastInsertRowid = newId;
      result.changes = 1;
      saveDb();
    }
    // 4. INSERT INTO document_shares
    else if (sql.includes('INSERT INTO document_shares')) {
      const [document_id, user_id, permission] = params;
      // Enforce unique constraint
      state.document_shares = state.document_shares.filter(
        s => !(s.document_id === Number(document_id) && s.user_id === Number(user_id))
      );
      const newId = nextIds.document_shares++;
      state.document_shares.push({
        id: newId,
        document_id: Number(document_id),
        user_id: Number(user_id),
        permission: permission || 'viewer',
        created_at: new Date().toISOString()
      });
      result.lastInsertRowid = newId;
      result.changes = 1;
      saveDb();
    }
    // 5. UPDATE document_shares
    else if (sql.includes('UPDATE document_shares SET permission')) {
      const [permission, id] = params;
      const share = state.document_shares.find(s => s.id === Number(id));
      if (share) {
        share.permission = permission;
        result.changes = 1;
        saveDb();
      }
    }
    // 6. UPDATE documents
    else if (sql.includes('UPDATE documents SET title')) {
      const [title, content, id] = params;
      const doc = state.documents.find(d => d.id === Number(id));
      if (doc) {
        doc.title = title !== undefined ? title : doc.title;
        doc.content = content !== undefined ? content : doc.content;
        doc.updated_at = new Date().toISOString();
        result.changes = 1;
        saveDb();
      }
    }
    // 7. DELETE FROM documents
    else if (sql.includes('DELETE FROM documents WHERE id = ?')) {
      const id = Number(params[0]);
      const prevLength = state.documents.length;
      state.documents = state.documents.filter(d => d.id !== id);
      // Cascade delete shares and versions
      state.document_shares = state.document_shares.filter(s => s.document_id !== id);
      state.document_versions = state.document_versions.filter(v => v.document_id !== id);
      result.changes = prevLength - state.documents.length;
      saveDb();
    }
    // 8. DELETE FROM document_shares
    else if (sql.includes('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?')) {
      const [docId, userId] = params.map(Number);
      const prevLength = state.document_shares.length;
      state.document_shares = state.document_shares.filter(
        s => !(s.document_id === docId && s.user_id === userId)
      );
      result.changes = prevLength - state.document_shares.length;
      saveDb();
    }

    return result;
  }

  get(...params) {
    const sql = this.sql;

    // 1. SELECT * FROM users WHERE username = ? OR username = 'bob'
    if (sql.includes('FROM users WHERE username')) {
      let username;
      if (sql.includes('?')) {
        username = params[0];
      } else {
        const match = sql.match(/username\s*=\s*'([^']+)'/i);
        if (match) username = match[1];
      }
      return state.users.find(u => u.username === username);
    }
    // 2. SELECT * FROM users WHERE id = ?
    else if (sql.includes('FROM users WHERE id = ?')) {
      const id = Number(params[0]);
      return state.users.find(u => u.id === id);
    }
    // 3. SELECT * FROM documents WHERE id = ?
    else if (sql.includes('SELECT * FROM documents WHERE id = ?')) {
      const id = Number(params[0]);
      return state.documents.find(d => d.id === id);
    }
    // 4. SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1
    else if (sql.includes('SELECT * FROM document_versions') && sql.includes('ORDER BY created_at DESC LIMIT 1')) {
      const docId = Number(params[0]);
      const filtered = state.document_versions.filter(v => v.document_id === docId);
      if (filtered.length === 0) return undefined;
      // Sort desc by id or created_at
      filtered.sort((a, b) => b.id - a.id);
      return filtered[0];
    }
    // 5. SELECT * FROM document_versions WHERE id = ? AND document_id = ?
    else if (sql.includes('SELECT * FROM document_versions WHERE id = ? AND document_id = ?')) {
      const [id, docId] = params.map(Number);
      return state.document_versions.find(v => v.id === id && v.document_id === docId);
    }
    // 6. SELECT ds.*, u.username, u.display_name FROM document_shares ds JOIN users u ON ds.user_id = u.id WHERE ds.document_id = ? AND ds.user_id = ?
    else if (sql.includes('SELECT ds.*, u.username, u.display_name FROM document_shares ds') && sql.includes('ds.document_id = ? AND ds.user_id = ?')) {
      const [docId, userId] = params.map(Number);
      const share = state.document_shares.find(s => s.document_id === docId && s.user_id === userId);
      if (!share) return undefined;
      const user = state.users.find(u => u.id === share.user_id);
      return {
        ...share,
        username: user?.username,
        display_name: user?.display_name
      };
    }
    // 7. SELECT permission FROM document_shares WHERE document_id = ? AND user_id = ?
    else if (sql.includes('SELECT permission FROM document_shares WHERE document_id = ? AND user_id = ?')) {
      const [docId, userId] = params.map(Number);
      const share = state.document_shares.find(s => s.document_id === docId && s.user_id === userId);
      return share ? { permission: share.permission } : undefined;
    }

    return undefined;
  }

  all(...params) {
    const sql = this.sql;

    // 1. SELECT d.*, u.username as owner_username, u.display_name as owner_display_name, 'owner' as access_level FROM documents d JOIN users u ON d.owner_id = u.id WHERE d.owner_id = ?
    if (sql.includes('access_level') && sql.includes('d.owner_id = ?')) {
      const ownerId = Number(params[0]);
      return state.documents
        .filter(d => d.owner_id === ownerId)
        .map(d => {
          const u = state.users.find(x => x.id === d.owner_id);
          return {
            ...d,
            owner_username: u?.username,
            owner_display_name: u?.display_name,
            access_level: 'owner'
          };
        });
    }
    // 2. SELECT d.*, u.username as owner_username, u.display_name as owner_display_name, ds.permission as access_level FROM documents d JOIN users u ON d.owner_id = u.id JOIN document_shares ds ON ds.document_id = d.id AND ds.user_id = ?
    else if (sql.includes('ds.permission as access_level') && sql.includes('ds.user_id = ?')) {
      const userId = Number(params[0]);
      const shares = state.document_shares.filter(s => s.user_id === userId);
      const results = [];
      for (const share of shares) {
        const doc = state.documents.find(d => d.id === share.document_id);
        if (doc) {
          const owner = state.users.find(u => u.id === doc.owner_id);
          results.push({
            ...doc,
            owner_username: owner?.username,
            owner_display_name: owner?.display_name,
            access_level: share.permission
          });
        }
      }
      return results;
    }
    // 3. SELECT ds.*, u.username, u.display_name FROM document_shares ds JOIN users u ON ds.user_id = u.id WHERE ds.document_id = ?
    else if (sql.includes('SELECT ds.*, u.username, u.display_name FROM document_shares ds') && sql.includes('ds.document_id = ?')) {
      const docId = Number(params[0]);
      return state.document_shares
        .filter(s => s.document_id === docId)
        .map(s => {
          const u = state.users.find(x => x.id === s.user_id);
          return {
            ...s,
            username: u?.username,
            display_name: u?.display_name
          };
        });
    }
    // 4. SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 50
    else if (sql.includes('SELECT * FROM document_versions WHERE document_id = ?')) {
      const docId = Number(params[0]);
      return state.document_versions
        .filter(v => v.document_id === docId)
        .sort((a, b) => b.id - a.id)
        .slice(0, 50);
    }

    return [];
  }
}

class MockDb {
  pragma(sql) {
    return this;
  }
  exec(sql) {
    return this;
  }
  prepare(sql) {
    return new Statement(sql);
  }
  close() {
    saveDb();
  }
}

const mockDbInstance = new MockDb();

function getDb() {
  return mockDbInstance;
}

function initDb() {
  loadDb();

  // Seed demo users if they don't exist yet
  const seedUsers = [
    { username: 'alice', display_name: 'Alice Johnson' },
    { username: 'bob', display_name: 'Bob Smith' },
    { username: 'charlie', display_name: 'Charlie Davis' },
  ];

  const insertUser = mockDbInstance.prepare(
    `INSERT OR IGNORE INTO users (username, display_name) VALUES (?, ?)`
  );

  for (const u of seedUsers) {
    insertUser.run(u.username, u.display_name);
  }

  return mockDbInstance;
}

// Load database immediately
initDb();

module.exports = { db: mockDbInstance, getDb, initDb };
