const Database = require('better-sqlite3');

// Create mock DB — variable must start with "mock" to be accessible inside jest.mock()
const mockDb = new Database(':memory:');
mockDb.exec(`
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

jest.mock('../config/database', () => {
  return { getDb: () => mockDb, getTestDb: () => mockDb };
});

// Tag model — does not exist yet; this require will fail (Red phase)
const Tag = require('../src/models/Tag');

beforeEach(() => {
  // Clear data between tests for isolation
  mockDb.exec('DELETE FROM bookmark_tags');
  mockDb.exec('DELETE FROM tags');
  mockDb.exec('DELETE FROM bookmarks');
});

afterAll(() => {
  mockDb.close();
});

// --- Schema tests (ACs 1-3): verify initSchema creates the expected tables ---

describe('initSchema — tags table', () => {
  test('tags table exists with columns: id, name, user_id, created_at', () => {
    // Use a fresh in-memory DB and run the real initSchema via getTestDb
    const realModule = jest.requireActual('../config/database');
    const testDb = realModule.getTestDb();

    const tableInfo = testDb.pragma('table_info(tags)');
    const columnNames = tableInfo.map(col => col.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('created_at');

    // Verify column types and constraints
    const idCol = tableInfo.find(c => c.name === 'id');
    expect(idCol.type).toBe('INTEGER');
    expect(idCol.pk).toBe(1);

    const nameCol = tableInfo.find(c => c.name === 'name');
    expect(nameCol.type).toBe('TEXT');
    expect(nameCol.notnull).toBe(1);

    const userIdCol = tableInfo.find(c => c.name === 'user_id');
    expect(userIdCol.type).toBe('INTEGER');
    expect(userIdCol.notnull).toBe(1);

    testDb.close();
  });

  test('unique constraint exists on (name, user_id)', () => {
    const realModule = jest.requireActual('../config/database');
    const testDb = realModule.getTestDb();

    const indexes = testDb.pragma('index_list(tags)');
    const uniqueIndexes = indexes.filter(idx => idx.unique === 1);

    let foundUniqueConstraint = false;
    for (const idx of uniqueIndexes) {
      const cols = testDb.pragma(`index_info(${idx.name})`);
      const colNames = cols.map(c => c.name).sort();
      if (colNames.length === 2 && colNames.includes('name') && colNames.includes('user_id')) {
        foundUniqueConstraint = true;
        break;
      }
    }

    expect(foundUniqueConstraint).toBe(true);

    testDb.close();
  });
});

describe('initSchema — bookmark_tags table', () => {
  test('bookmark_tags table exists with correct columns and composite primary key', () => {
    const realModule = jest.requireActual('../config/database');
    const testDb = realModule.getTestDb();

    const tableInfo = testDb.pragma('table_info(bookmark_tags)');
    const columnNames = tableInfo.map(col => col.name);

    expect(columnNames).toContain('bookmark_id');
    expect(columnNames).toContain('tag_id');

    const bookmarkIdCol = tableInfo.find(c => c.name === 'bookmark_id');
    expect(bookmarkIdCol.type).toBe('INTEGER');
    expect(bookmarkIdCol.notnull).toBe(1);

    const tagIdCol = tableInfo.find(c => c.name === 'tag_id');
    expect(tagIdCol.type).toBe('INTEGER');
    expect(tagIdCol.notnull).toBe(1);

    // Composite primary key on (bookmark_id, tag_id)
    const pkColumns = tableInfo.filter(c => c.pk > 0).map(c => c.name).sort();
    expect(pkColumns).toEqual(['bookmark_id', 'tag_id']);

    testDb.close();
  });
});

// --- Model tests (ACs 4-10): verify Tag static methods ---

describe('Tag.create', () => {
  test('creates a tag and returns object with id, name, and user_id', () => {
    const tag = Tag.create({ name: 'javascript', userId: 1 });

    expect(tag).toHaveProperty('id');
    expect(tag.id).toBeGreaterThan(0);
    expect(tag.name).toBe('javascript');
    expect(tag.user_id).toBe(1);
  });

  test('returns existing tag instead of throwing when duplicate name+userId', () => {
    const first = Tag.create({ name: 'javascript', userId: 1 });
    const second = Tag.create({ name: 'javascript', userId: 1 });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('javascript');
    expect(second.user_id).toBe(1);
  });
});

describe('Tag.findByUser', () => {
  test('returns tags for the given user ordered alphabetically by name', () => {
    Tag.create({ name: 'python', userId: 1 });
    Tag.create({ name: 'javascript', userId: 1 });

    const tags = Tag.findByUser(1);

    expect(tags).toHaveLength(2);
    expect(tags[0].name).toBe('javascript');
    expect(tags[1].name).toBe('python');
  });
});

describe('Tag.findById', () => {
  test('returns the tag record for a given id', () => {
    const created = Tag.create({ name: 'typescript', userId: 1 });

    const found = Tag.findById(created.id);

    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.name).toBe('typescript');
    expect(found.user_id).toBe(1);
  });
});

describe('Tag.addToBookmark', () => {
  let bookmarkId;
  let tagId;

  beforeEach(() => {
    const result = mockDb.prepare(
      'INSERT INTO bookmarks (url, title, user_id) VALUES (?, ?, ?)'
    ).run('https://example.com', 'Example', 1);
    bookmarkId = Number(result.lastInsertRowid);

    const tag = Tag.create({ name: 'javascript', userId: 1 });
    tagId = tag.id;
  });

  test('inserts a row into bookmark_tags', () => {
    Tag.addToBookmark({ bookmarkId, tagId });

    const row = mockDb.prepare(
      'SELECT * FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?'
    ).get(bookmarkId, tagId);

    expect(row).toBeDefined();
    expect(row.bookmark_id).toBe(bookmarkId);
    expect(row.tag_id).toBe(tagId);
  });

  test('is idempotent — calling again does not throw', () => {
    Tag.addToBookmark({ bookmarkId, tagId });

    expect(() => {
      Tag.addToBookmark({ bookmarkId, tagId });
    }).not.toThrow();

    // Verify still only one row
    const count = mockDb.prepare(
      'SELECT COUNT(*) as cnt FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = ?'
    ).get(bookmarkId, tagId);
    expect(count.cnt).toBe(1);
  });
});

describe('Tag.findByBookmark', () => {
  test('returns all tags associated with a bookmark', () => {
    const bmResult = mockDb.prepare(
      'INSERT INTO bookmarks (url, title, user_id) VALUES (?, ?, ?)'
    ).run('https://example.com', 'Example', 1);
    const bookmarkId = Number(bmResult.lastInsertRowid);

    const tag1 = Tag.create({ name: 'javascript', userId: 1 });
    const tag2 = Tag.create({ name: 'tutorial', userId: 1 });

    Tag.addToBookmark({ bookmarkId, tagId: tag1.id });
    Tag.addToBookmark({ bookmarkId, tagId: tag2.id });

    const tags = Tag.findByBookmark(bookmarkId);

    expect(tags).toHaveLength(2);
    const tagNames = tags.map(t => t.name).sort();
    expect(tagNames).toEqual(['javascript', 'tutorial']);
  });
});
