const Tag = require('../src/models/Tag');
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

// Helper: insert a bookmark directly for join-table tests
function insertBookmark(id, userId) {
  const db = getDb();
  db.prepare(
    'INSERT INTO bookmarks (id, url, title, user_id) VALUES (?, ?, ?, ?)'
  ).run(id, `https://example.com/${id}`, `Bookmark ${id}`, userId);
}

// Helper: insert a tag directly for join-table tests
function insertTag(id, name, userId) {
  const db = getDb();
  db.prepare(
    'INSERT INTO tags (id, name, user_id) VALUES (?, ?, ?)'
  ).run(id, name, userId);
}

beforeEach(() => {
  const db = getDb();
  db.exec('DELETE FROM bookmark_tags');
  db.exec('DELETE FROM tags');
  db.exec('DELETE FROM bookmarks');
});

// --- AC 1: tags table schema ---
describe('tags table schema', () => {
  test('tags table exists with id, name, user_id, and created_at columns', () => {
    const db = getDb();
    const columns = db.prepare("PRAGMA table_info('tags')").all();
    const colNames = columns.map(c => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('name');
    expect(colNames).toContain('user_id');
    expect(colNames).toContain('created_at');

    // id is INTEGER PRIMARY KEY AUTOINCREMENT
    const idCol = columns.find(c => c.name === 'id');
    expect(idCol.pk).toBe(1);

    // name is NOT NULL
    const nameCol = columns.find(c => c.name === 'name');
    expect(nameCol.notnull).toBe(1);

    // user_id is NOT NULL
    const userIdCol = columns.find(c => c.name === 'user_id');
    expect(userIdCol.notnull).toBe(1);
  });
});

// --- AC 2: unique constraint on (name, user_id) ---
describe('tags unique constraint', () => {
  test('unique constraint on (name, user_id) prevents duplicate tag names per user', () => {
    const db = getDb();
    db.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);

    expect(() => {
      db.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);
    }).toThrow();
  });
});

// --- AC 3: bookmark_tags join table schema ---
describe('bookmark_tags table schema', () => {
  test('bookmark_tags table exists with bookmark_id and tag_id columns and composite PK', () => {
    const db = getDb();
    const columns = db.prepare("PRAGMA table_info('bookmark_tags')").all();
    const colNames = columns.map(c => c.name);

    expect(colNames).toContain('bookmark_id');
    expect(colNames).toContain('tag_id');

    // Both columns are NOT NULL
    const bmCol = columns.find(c => c.name === 'bookmark_id');
    expect(bmCol.notnull).toBe(1);

    const tagCol = columns.find(c => c.name === 'tag_id');
    expect(tagCol.notnull).toBe(1);

    // Composite primary key — both columns should have pk > 0
    expect(bmCol.pk).toBeGreaterThan(0);
    expect(tagCol.pk).toBeGreaterThan(0);

    // Verify foreign keys reference the correct tables
    const fks = db.prepare("PRAGMA foreign_key_list('bookmark_tags')").all();
    const fkTables = fks.map(fk => fk.table);
    expect(fkTables).toContain('bookmarks');
    expect(fkTables).toContain('tags');
  });
});

// --- AC 4: Tag.create inserts a new tag and returns it ---
describe('Tag.create', () => {
  test('creates a tag record and returns object with id, name, and user_id', () => {
    const tag = Tag.create({ name: 'javascript', userId: 1 });

    expect(tag).toHaveProperty('id');
    expect(tag.name).toBe('javascript');
    expect(tag.user_id).toBe(1);
  });

  // --- AC 5: Tag.create returns existing tag on duplicate ---
  test('returns existing tag when creating a duplicate name for the same user', () => {
    const first = Tag.create({ name: 'javascript', userId: 1 });
    const second = Tag.create({ name: 'javascript', userId: 1 });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('javascript');
    expect(second.user_id).toBe(1);
  });
});

// --- AC 6: Tag.findByUser returns tags ordered alphabetically ---
describe('Tag.findByUser', () => {
  test('returns all tags for a user ordered alphabetically by name', () => {
    Tag.create({ name: 'python', userId: 1 });
    Tag.create({ name: 'javascript', userId: 1 });

    const tags = Tag.findByUser(1);

    expect(tags).toHaveLength(2);
    expect(tags[0].name).toBe('javascript');
    expect(tags[1].name).toBe('python');
  });
});

// --- AC 7: Tag.findById returns a single tag ---
describe('Tag.findById', () => {
  test('returns the tag record for a given id', () => {
    insertTag(5, 'css', 1);

    const tag = Tag.findById(5);

    expect(tag).toBeDefined();
    expect(tag.id).toBe(5);
    expect(tag.name).toBe('css');
    expect(tag.user_id).toBe(1);
  });
});

// --- AC 8: Tag.addToBookmark inserts a row into bookmark_tags ---
describe('Tag.addToBookmark', () => {
  test('inserts a row into bookmark_tags linking a bookmark and tag', () => {
    insertBookmark(10, 1);
    insertTag(5, 'javascript', 1);

    Tag.addToBookmark({ bookmarkId: 10, tagId: 5 });

    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?'
    ).get(10, 5);

    expect(row).toBeDefined();
    expect(row.bookmark_id).toBe(10);
    expect(row.tag_id).toBe(5);
  });

  // --- AC 9: Tag.addToBookmark is idempotent ---
  test('does not throw when adding the same bookmark-tag pair twice (idempotent)', () => {
    insertBookmark(10, 1);
    insertTag(5, 'javascript', 1);

    Tag.addToBookmark({ bookmarkId: 10, tagId: 5 });

    expect(() => {
      Tag.addToBookmark({ bookmarkId: 10, tagId: 5 });
    }).not.toThrow();
  });
});

// --- AC 10: Tag.findByBookmark returns all tags for a bookmark ---
describe('Tag.findByBookmark', () => {
  test('returns all tag records associated with a given bookmark', () => {
    insertBookmark(10, 1);
    insertTag(5, 'javascript', 1);
    insertTag(6, 'tutorial', 1);

    const db = getDb();
    db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(10, 5);
    db.prepare('INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)').run(10, 6);

    const tags = Tag.findByBookmark(10);

    expect(tags).toHaveLength(2);
    const names = tags.map(t => t.name).sort();
    expect(names).toEqual(['javascript', 'tutorial']);
  });
});
