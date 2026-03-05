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
  db.prepare('INSERT INTO bookmarks (id, url, title, user_id) VALUES (?, ?, ?, ?)').run(
    id, `https://example.com/${id}`, `Bookmark ${id}`, userId
  );
}

// --- Schema tests (AC 1-3) ---

describe('Tag schema (initSchema)', () => {
  test('tags table exists with correct columns: id, name, user_id, created_at', () => {
    const { getTestDb } = require('../config/database');
    const db = getTestDb();

    // initSchema should create the tags table — use the production initSchema
    const { initSchema } = jest.requireActual('../config/database');

    const freshDb = new Database(':memory:');
    initSchema(freshDb);

    const columns = freshDb.pragma('table_info(tags)');
    const columnNames = columns.map(c => c.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('created_at');

    // Verify column types
    const idCol = columns.find(c => c.name === 'id');
    expect(idCol.type).toBe('INTEGER');
    expect(idCol.pk).toBe(1);

    const nameCol = columns.find(c => c.name === 'name');
    expect(nameCol.type).toBe('TEXT');
    expect(nameCol.notnull).toBe(1);

    const userIdCol = columns.find(c => c.name === 'user_id');
    expect(userIdCol.type).toBe('INTEGER');
    expect(userIdCol.notnull).toBe(1);

    const createdAtCol = columns.find(c => c.name === 'created_at');
    expect(createdAtCol.type).toBe('DATETIME');

    freshDb.close();
  });

  test('tags table has a unique constraint on (name, user_id)', () => {
    const { initSchema } = jest.requireActual('../config/database');

    const freshDb = new Database(':memory:');
    initSchema(freshDb);

    // Insert a tag
    freshDb.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);

    // Attempting to insert a duplicate should throw a constraint error
    expect(() => {
      freshDb.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 1);
    }).toThrow();

    // Same name for a different user should succeed
    expect(() => {
      freshDb.prepare('INSERT INTO tags (name, user_id) VALUES (?, ?)').run('javascript', 2);
    }).not.toThrow();

    freshDb.close();
  });

  test('bookmark_tags table exists with correct columns and composite primary key', () => {
    const { initSchema } = jest.requireActual('../config/database');

    const freshDb = new Database(':memory:');
    initSchema(freshDb);

    const columns = freshDb.pragma('table_info(bookmark_tags)');
    const columnNames = columns.map(c => c.name);

    expect(columnNames).toContain('bookmark_id');
    expect(columnNames).toContain('tag_id');

    // Verify foreign key columns are NOT NULL
    const bookmarkIdCol = columns.find(c => c.name === 'bookmark_id');
    expect(bookmarkIdCol.type).toBe('INTEGER');
    expect(bookmarkIdCol.notnull).toBe(1);

    const tagIdCol = columns.find(c => c.name === 'tag_id');
    expect(tagIdCol.type).toBe('INTEGER');
    expect(tagIdCol.notnull).toBe(1);

    // Composite primary key — both columns should be part of pk
    const pkColumns = columns.filter(c => c.pk > 0).map(c => c.name);
    expect(pkColumns).toContain('bookmark_id');
    expect(pkColumns).toContain('tag_id');

    // Verify foreign keys exist
    const fks = freshDb.pragma('foreign_key_list(bookmark_tags)');
    const fkTables = fks.map(fk => fk.table);
    expect(fkTables).toContain('bookmarks');
    expect(fkTables).toContain('tags');

    freshDb.close();
  });
});

// --- Model tests (AC 4-10) ---

describe('Tag model', () => {
  let Tag;

  beforeAll(() => {
    Tag = require('../src/models/Tag');
  });

  beforeEach(() => {
    const db = getDb();
    db.exec('DELETE FROM bookmark_tags');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM bookmarks');
  });

  describe('Tag.create', () => {
    test('creates a tag and returns object with id, name, and user_id', () => {
      const tag = Tag.create({ name: 'javascript', userId: 1 });

      expect(tag).toHaveProperty('id');
      expect(tag.name).toBe('javascript');
      expect(tag.user_id).toBe(1);
    });

    test('returns existing tag instead of throwing when duplicate name+user', () => {
      const first = Tag.create({ name: 'javascript', userId: 1 });
      const second = Tag.create({ name: 'javascript', userId: 1 });

      expect(second.id).toBe(first.id);
      expect(second.name).toBe('javascript');
      expect(second.user_id).toBe(1);
    });
  });

  describe('Tag.findByUser', () => {
    test('returns all tags for a user ordered alphabetically by name', () => {
      Tag.create({ name: 'python', userId: 1 });
      Tag.create({ name: 'javascript', userId: 1 });
      Tag.create({ name: 'rust', userId: 2 }); // different user, should not appear

      const tags = Tag.findByUser(1);

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('javascript');
      expect(tags[1].name).toBe('python');
    });
  });

  describe('Tag.findById', () => {
    test('returns the tag record for a given id', () => {
      const created = Tag.create({ name: 'javascript', userId: 1 });
      const found = Tag.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('javascript');
      expect(found.user_id).toBe(1);
    });
  });

  describe('Tag.addToBookmark', () => {
    test('inserts a row into bookmark_tags linking bookmark and tag', () => {
      insertBookmark(10, 1);
      const tag = Tag.create({ name: 'javascript', userId: 1 });

      Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });

      const db = getDb();
      const row = db.prepare('SELECT * FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?').get(10, tag.id);
      expect(row).toBeDefined();
      expect(row.bookmark_id).toBe(10);
      expect(row.tag_id).toBe(tag.id);
    });

    test('is idempotent — calling twice does not throw', () => {
      insertBookmark(10, 1);
      const tag = Tag.create({ name: 'javascript', userId: 1 });

      Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });

      expect(() => {
        Tag.addToBookmark({ bookmarkId: 10, tagId: tag.id });
      }).not.toThrow();

      // Should still have exactly one row
      const db = getDb();
      const rows = db.prepare('SELECT * FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?').all(10, tag.id);
      expect(rows).toHaveLength(1);
    });
  });

  describe('Tag.findByBookmark', () => {
    test('returns all tags associated with a bookmark', () => {
      insertBookmark(10, 1);
      const tag1 = Tag.create({ name: 'javascript', userId: 1 });
      const tag2 = Tag.create({ name: 'tutorial', userId: 1 });

      Tag.addToBookmark({ bookmarkId: 10, tagId: tag1.id });
      Tag.addToBookmark({ bookmarkId: 10, tagId: tag2.id });

      const tags = Tag.findByBookmark(10);

      expect(tags).toHaveLength(2);
      const names = tags.map(t => t.name);
      expect(names).toContain('javascript');
      expect(names).toContain('tutorial');
    });
  });
});
