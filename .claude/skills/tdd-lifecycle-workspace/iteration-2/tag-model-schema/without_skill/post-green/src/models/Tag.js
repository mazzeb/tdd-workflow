const { getDb } = require('../../config/database');

class Tag {
  static create({ name, userId }) {
    const db = getDb();
    const existing = db.prepare(
      'SELECT * FROM tags WHERE name = ? AND user_id = ?'
    ).get(name, userId);

    if (existing) {
      return existing;
    }

    const result = db.prepare(
      'INSERT INTO tags (name, user_id) VALUES (?, ?)'
    ).run(name, userId);

    return this.findById(result.lastInsertRowid);
  }

  static findByUser(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId);
  }

  static findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  }

  static addToBookmark({ bookmarkId, tagId }) {
    const db = getDb();
    db.prepare(
      'INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)'
    ).run(bookmarkId, tagId);
  }

  static findByBookmark(bookmarkId) {
    const db = getDb();
    return db.prepare(
      `SELECT t.* FROM tags t
       INNER JOIN bookmark_tags bt ON bt.tag_id = t.id
       WHERE bt.bookmark_id = ?`
    ).all(bookmarkId);
  }
}

module.exports = Tag;
