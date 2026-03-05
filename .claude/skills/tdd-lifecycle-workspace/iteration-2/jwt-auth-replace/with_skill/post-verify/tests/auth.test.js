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
  // AC: Given a request with a valid JWT Bearer token (signed with the app secret, not expired),
  //     when the authenticate middleware runs,
  //     then req.user is set to { id: <userId> } and next() is called
  test('sets req.user with correct userId and calls next() for a valid JWT token', async () => {
    const token = jwt.sign({ sub: 42 }, JWT_SECRET, { expiresIn: '15m' });

    // Create a bookmark — this proves req.user.id was set correctly from the JWT
    const createRes = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', title: 'JWT Test' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toMatchObject({
      url: 'https://example.com',
      title: 'JWT Test',
      user_id: 42,
    });
  });

  // AC: Given a request with an expired JWT token,
  //     when the authenticate middleware runs,
  //     then the response is 401 with { error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } }
  test('returns 401 with TOKEN_EXPIRED for an expired JWT token', async () => {
    const token = jwt.sign({ sub: 1 }, JWT_SECRET, { expiresIn: '-1s' });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
    });
  });

  // AC: Given a request with a JWT token signed with the wrong secret,
  //     when the authenticate middleware runs,
  //     then the response is 401 with { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
  test('returns 401 with UNAUTHORIZED for a token signed with wrong secret', async () => {
    const token = jwt.sign({ sub: 1 }, 'wrong-secret', { expiresIn: '15m' });

    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  });

  // AC: Given a request with a malformed token (not valid JWT),
  //     when the authenticate middleware runs,
  //     then the response is 401 with { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }
  test('returns 401 with UNAUTHORIZED for a malformed (non-JWT) token', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', 'Bearer not-a-valid-jwt-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  });

  // AC: Given a request with no Authorization header,
  //     when the authenticate middleware runs,
  //     then the response is 401 with { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }
  test('returns 401 with UNAUTHORIZED when no Authorization header is present', async () => {
    const res = await request(app)
      .get('/api/bookmarks');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
    });
  });
});
