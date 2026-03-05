const { getDb } = require('../../config/database');

class Bookmark {
  static findByUser(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }

  static findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id);
  }

  static create({ url, title, folderId, userId }) {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO bookmarks (url, title, folder_id, user_id) VALUES (?, ?, ?, ?)'
    ).run(url, title, folderId, userId);

    return this.findById(result.lastInsertRowid);
  }

  static delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }

  static findByFolder(folderId, userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM bookmarks WHERE folder_id = ? AND user_id = ?').all(folderId, userId);
  }
}

module.exports = Bookmark;
