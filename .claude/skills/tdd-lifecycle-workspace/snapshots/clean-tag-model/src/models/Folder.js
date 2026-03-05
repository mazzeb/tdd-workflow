const { getDb } = require('../../config/database');

class Folder {
  static findByUser(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC').all(userId);
  }

  static findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  }

  static create({ name, parentId, userId }) {
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO folders (name, parent_id, user_id) VALUES (?, ?, ?)'
    ).run(name, parentId, userId);

    return this.findById(result.lastInsertRowid);
  }
}

module.exports = Folder;
