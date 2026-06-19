const request = require('supertest');

// Force test mode so we use in-memory db
process.env.NODE_ENV = 'test';

const app = require('../server');
const { getDb, initDb } = require('../db');

// We need a way to manage sessions across requests in supertest
// supertest doesn't persist cookies by default, so we use an agent
let agent;

beforeAll(() => {
  initDb(); // make sure tables + seed data exist
});

beforeEach(() => {
  agent = request.agent(app);
});

afterAll(() => {
  const db = getDb();
  db.close();
});

describe('Auth', () => {
  it('should login with valid username', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ username: 'alice' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.displayName).toBe('Alice Johnson');
  });

  it('should reject login with unknown username', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ username: 'nobody' });

    expect(res.status).toBe(404);
  });

  it('should return current user from /me after login', async () => {
    await agent.post('/api/auth/login').send({ username: 'alice' });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
  });

  it('should return 401 from /me when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should logout successfully', async () => {
    await agent.post('/api/auth/login').send({ username: 'alice' });
    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    // Should be logged out now
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });
});

describe('Documents CRUD', () => {
  let docId;

  beforeEach(async () => {
    await agent.post('/api/auth/login').send({ username: 'alice' });
  });

  it('should create a document', async () => {
    const res = await agent
      .post('/api/documents')
      .send({ title: 'Test Doc', content: '<p>Hello world</p>' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Doc');
    docId = res.body.id;
  });

  it('should list documents', async () => {
    // Create one first
    await agent.post('/api/documents').send({ title: 'Listed Doc' });

    const res = await agent.get('/api/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should get a single document', async () => {
    const createRes = await agent
      .post('/api/documents')
      .send({ title: 'Detail Doc' });

    const res = await agent.get(`/api/documents/${createRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Detail Doc');
    expect(res.body.owner).toBeDefined();
    expect(res.body.accessLevel).toBe('owner');
  });

  it('should update a document', async () => {
    const createRes = await agent
      .post('/api/documents')
      .send({ title: 'Update Me' });

    const res = await agent
      .put(`/api/documents/${createRes.body.id}`)
      .send({ title: 'Updated Title', content: '<p>New content</p>' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it('should delete a document', async () => {
    const createRes = await agent
      .post('/api/documents')
      .send({ title: 'Delete Me' });

    const delRes = await agent.delete(`/api/documents/${createRes.body.id}`);
    expect(delRes.status).toBe(200);

    // Should be gone now
    const getRes = await agent.get(`/api/documents/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });
});

describe('Sharing', () => {
  let aliceAgent, bobAgent, docId;

  beforeEach(async () => {
    aliceAgent = request.agent(app);
    bobAgent = request.agent(app);

    await aliceAgent.post('/api/auth/login').send({ username: 'alice' });
    await bobAgent.post('/api/auth/login').send({ username: 'bob' });

    // Alice creates a doc
    const res = await aliceAgent
      .post('/api/documents')
      .send({ title: 'Shared Doc' });
    docId = res.body.id;
  });

  it('should share a document', async () => {
    const res = await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'editor' });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe('bob');
    expect(res.body.permission).toBe('editor');
  });

  it('should allow shared user to access the document', async () => {
    // Share with bob as viewer
    await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'viewer' });

    // Bob should be able to read it
    const res = await bobAgent.get(`/api/documents/${docId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Shared Doc');
  });

  it('should list shares', async () => {
    await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'editor' });

    const res = await aliceAgent.get(`/api/documents/${docId}/shares`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].username).toBe('bob');
  });

  it('should revoke a share', async () => {
    await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'viewer' });

    // Get bob's user id
    const db = getDb();
    const bob = db.prepare("SELECT id FROM users WHERE username = 'bob'").get();

    const res = await aliceAgent
      .delete(`/api/documents/${docId}/share/${bob.id}`);
    expect(res.status).toBe(200);

    // Bob should no longer have access
    const getRes = await bobAgent.get(`/api/documents/${docId}`);
    expect(getRes.status).toBe(403);
  });
});

describe('Permission enforcement', () => {
  let aliceAgent, bobAgent, charlieAgent, docId;

  beforeEach(async () => {
    aliceAgent = request.agent(app);
    bobAgent = request.agent(app);
    charlieAgent = request.agent(app);

    await aliceAgent.post('/api/auth/login').send({ username: 'alice' });
    await bobAgent.post('/api/auth/login').send({ username: 'bob' });
    await charlieAgent.post('/api/auth/login').send({ username: 'charlie' });

    const res = await aliceAgent
      .post('/api/documents')
      .send({ title: 'Permission Test Doc' });
    docId = res.body.id;
  });

  it('viewer cannot edit a document', async () => {
    await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'viewer' });

    const res = await bobAgent
      .put(`/api/documents/${docId}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
  });

  it('non-shared user cannot access a document', async () => {
    const res = await charlieAgent.get(`/api/documents/${docId}`);
    expect(res.status).toBe(403);
  });

  it('editor can update but not delete', async () => {
    await aliceAgent
      .post(`/api/documents/${docId}/share`)
      .send({ username: 'bob', permission: 'editor' });

    // Editor can update
    const updateRes = await bobAgent
      .put(`/api/documents/${docId}`)
      .send({ title: 'Editor Update' });
    expect(updateRes.status).toBe(200);

    // Editor cannot delete
    const deleteRes = await bobAgent.delete(`/api/documents/${docId}`);
    expect(deleteRes.status).toBe(403);
  });
});

describe('File upload', () => {
  beforeEach(async () => {
    await agent.post('/api/auth/login').send({ username: 'alice' });
  });

  it('should upload a .txt file and create a document', async () => {
    const txtContent = 'Line one\nLine two\nLine three';
    const buffer = Buffer.from(txtContent, 'utf-8');

    const res = await agent
      .post('/api/upload')
      .attach('file', buffer, 'notes.txt');

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('notes');
    expect(res.body.content).toContain('<p>');
  });

  it('should reject unsupported file types', async () => {
    const buffer = Buffer.from('not an image', 'utf-8');

    const res = await agent
      .post('/api/upload')
      .attach('file', buffer, 'photo.png');

    // multer should reject it
    expect(res.status).toBe(500); // multer error bubbles up
  });
});

describe('Versions', () => {
  let docId;

  beforeEach(async () => {
    await agent.post('/api/auth/login').send({ username: 'alice' });

    const res = await agent
      .post('/api/documents')
      .send({ title: 'Versioned Doc', content: '<p>v1</p>' });
    docId = res.body.id;
  });

  it('should list version history', async () => {
    const res = await agent.get(`/api/documents/${docId}/versions`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should have at least the initial version
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should restore a version', async () => {
    // Get the initial version
    const versionsRes = await agent.get(`/api/documents/${docId}/versions`);
    const initialVersion = versionsRes.body[versionsRes.body.length - 1];

    // Update the doc so it's different
    // We need to manually create a version with different timestamp to bypass the 5-min throttle
    const db = getDb();
    db.prepare(
      "INSERT INTO document_versions (document_id, title, content, created_at) VALUES (?, ?, ?, datetime('now', '-10 minutes'))"
    ).run(docId, 'Old Title', '<p>old content</p>');

    await agent
      .put(`/api/documents/${docId}`)
      .send({ title: 'New Title', content: '<p>new content</p>' });

    // Now restore to the initial version
    const restoreRes = await agent
      .post(`/api/documents/${docId}/restore/${initialVersion.id}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.title).toBe('Versioned Doc');
    expect(restoreRes.body.content).toBe('<p>v1</p>');
  });
});
