const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { getTestDb } = require('../config/database');

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

const userToken = jwt.sign({ sub: 1 }, 'test-secret'); // user ID 1

describe('GET /api/bookmarks', () => {
  test('returns empty array when no bookmarks exist', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/bookmarks');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/bookmarks', () => {
  test('creates a bookmark with url and title', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ url: 'https://example.com', title: 'Example' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      url: 'https://example.com',
      title: 'Example',
    });
  });

  test('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'No URL' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_URL');
  });
});
