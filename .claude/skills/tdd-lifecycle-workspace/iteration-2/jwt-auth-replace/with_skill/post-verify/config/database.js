const Database = require('better-sqlite3');

let db;

function getDb() {
  if (!db) {
    db = new Database(process.env.DB_PATH || './data/bookmarks.db');
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function getTestDb() {
  const testDb = new Database(':memory:');
  initSchema(testDb);
  return testDb;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      folder_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id)
    );
  `);
}

module.exports = { getDb, getTestDb };
