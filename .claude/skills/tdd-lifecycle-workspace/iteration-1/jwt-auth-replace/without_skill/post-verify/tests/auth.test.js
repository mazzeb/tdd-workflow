const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Mock the database module to use in-memory DB
jest.mock('../config/database', () => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      folder_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return { getDb: () => db, getTestDb: () => db };
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

describe('authenticate middleware — JWT verification', () => {
  test('sets req.user and calls next() for a valid JWT token', async () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, { expiresIn: '15m' });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('returns 401 with TOKEN_EXPIRED code for an expired JWT token', async () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    expect(res.body.error.message).toBe('Token has expired');
  });

  test('returns 401 with UNAUTHORIZED code for a JWT signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: 1 }, 'wrong-secret', { expiresIn: '15m' });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid token');
  });

  test('returns 401 with UNAUTHORIZED code for a malformed (non-JWT) token', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', 'Bearer not-a-valid-jwt-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid token');
  });

  test('returns 401 with UNAUTHORIZED code when no Authorization header is present', async () => {
    const res = await request(app)
      .get('/api/bookmarks');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Missing or invalid token');
  });
});
