const Database = require('better-sqlite3');

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
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, user_id)
    );
    CREATE TABLE bookmark_tags (
      bookmark_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (bookmark_id, tag_id),
      FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );
  `);
  return { getDb: () => db, getTestDb: () => db };
});

const { getDb } = require('../config/database');
const Tag = require('../src/models/Tag');

// Helper: insert a bookmark directly so we can reference it in join-table tests
function insertBookmark(id, userId) {
  const db = getDb();
  db.prepare(
    'INSERT INTO bookmarks (id, url, title, user_id) VALUES (?, ?, ?, ?)'
  ).run(id, `https://example.com/${id}`, `Bookmark ${id}`, userId);
}

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM bookmark_tags');
  db.exec('DELETE FROM tags');
  db.exec('DELETE FROM bookmarks');
});

// --- Schema tests -----------------------------------------------------------

describe('tags table schema', () => {
  test('tags table exists with id, name, user_id, created_at columns', () => {
    const db = getDb();
    const columns = db.pragma('table_info(tags)');
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('created_at');
  });

  test('unique constraint on (name, user_id) prevents duplicate tag names per user', () => {
    const db = getDb();
    db.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);

    // Same name + same user should violate the unique constraint
    expect(() => {
      db.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);
    }).toThrow();

    // Same name + different user should succeed
    expect(() => {
      db.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 2);
    }).not.toThrow();
  });
});

describe('bookmark_tags table schema', () => {
  test('bookmark_tags table exists with bookmark_id and tag_id columns', () => {
    const db = getDb();
    const columns = db.pragma('table_info(bookmark_tags)');
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toContain('bookmark_id');
    expect(columnNames).toContain('tag_id');
  });

  test('composite primary key on (bookmark_id, tag_id)', () => {
    const db = getDb();
    insertBookmark(1, 1);
    db.prepare('INSERT INTO tags (id, name, user_id) VALUES (?, ?, ?)').run(1, 'test', 1);
    db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(1, 1);

    // Duplicate (bookmark_id, tag_id) should violate primary key
    expect(() => {
      db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(1, 1);
    }).toThrow();
  });
});

// --- Tag.create() ------------------------------------------------------------

describe('Tag.create', () => {
  test('inserts a new tag and returns object with id, name, and user_id', () => {
    const tag = Tag.create({ name: 'javascript', userId: 1 });

    expect(tag).toMatchObject({
      name: 'javascript',
      user_id: 1,
    });
    expect(tag.id).toBeDefined();
  });

  test('returns existing tag instead of throwing when duplicate name+user', () => {
    const first = Tag.create({ name: 'javascript', userId: 1 });
    const second = Tag.create({ name: 'javascript', userId: 1 });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('javascript');
  });
});

// --- Tag.findByUser() --------------------------------------------------------

describe('Tag.findByUser', () => {
  test('returns tags for a user ordered alphabetically by name', () => {
    Tag.create({ name: 'python', userId: 1 });
    Tag.create({ name: 'javascript', userId: 1 });

    const tags = Tag.findByUser(1);

    expect(tags).toHaveLength(2);
    expect(tags[0].name).toBe('javascript');
    expect(tags[1].name).toBe('python');
  });
});

// --- Tag.findById() ----------------------------------------------------------

describe('Tag.findById', () => {
  test('returns the tag record for the given id', () => {
    const created = Tag.create({ name: 'rust', userId: 1 });
    const found = Tag.findById(created.id);

    expect(found).toMatchObject({
      id: created.id,
      name: 'rust',
      user_id: 1,
    });
  });
});

// --- Tag.addToBookmark() -----------------------------------------------------

describe('Tag.addToBookmark', () => {
  test('inserts a row into bookmark_tags', () => {
    insertBookmark(10, 1);
    const tag = Tag.create({ name: 'javascript', userId: 1 });

    Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });

    const db = getDb();
    const row = db
      .prepare('SELECT * FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?')
      .get(10, tag.id);
    expect(row).toBeDefined();
    expect(row.bookmark_id).toBe(10);
    expect(row.tag_id).toBe(tag.id);
  });

  test('does not throw when the same bookmark-tag pair is added again (idempotent)', () => {
    insertBookmark(10, 1);
    const tag = Tag.create({ name: 'javascript', userId: 1 });

    Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });

    expect(() => {
      Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });
    }).not.toThrow();
  });
});

// --- Tag.findByBookmark() ----------------------------------------------------

describe('Tag.findByBookmark', () => {
  test('returns all tags associated with a bookmark', () => {
    insertBookmark(10, 1);
    const tag1 = Tag.create({ name: 'javascript', userId: 1 });
    const tag2 = Tag.create({ name: 'tutorial', userId: 1 });

    Tag.addToBookmark({ bookmarkId: 10, tagId: tag1.id });
    Tag.addToBookmark({ bookmarkId: 10, tagId: tag2.id });

    const tags = Tag.findByBookmark(10);

    expect(tags).toHaveLength(2);
    const names = tags.map((t) => t.name).sort();
    expect(names).toEqual(['javascript', 'tutorial']);
  });
});
