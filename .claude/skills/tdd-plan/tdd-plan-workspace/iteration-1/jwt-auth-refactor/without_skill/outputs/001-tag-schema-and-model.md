---
status: pending
priority: high
depends-on: []
---

# 001 — Tag Schema and Model

## Description

Create the database schema for tags and the many-to-many relationship between bookmarks and tags. Implement a `Tag` model class following the same patterns as the existing `Bookmark` and `Folder` models (static methods, same DB access style).

Two new tables are needed:

- `tags` — stores unique tag names per user (`id`, `name`, `user_id`, `created_at`)
- `bookmark_tags` — join table linking bookmarks to tags (`bookmark_id`, `tag_id`)

The `Tag` model should provide foundational CRUD operations that the subsequent tasks will build on.

## Acceptance Criteria

- [ ] Given the database is initialized, when the schema runs, then a `tags` table exists with columns: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `name` (TEXT NOT NULL), `user_id` (INTEGER NOT NULL), `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP).
- [ ] Given the database is initialized, when the schema runs, then a `bookmark_tags` join table exists with columns: `bookmark_id` (INTEGER NOT NULL, FK to bookmarks), `tag_id` (INTEGER NOT NULL, FK to tags), and a UNIQUE constraint on (`bookmark_id`, `tag_id`).
- [ ] Given a user ID and tag name, when `Tag.findOrCreate({ name, userId })` is called, then it returns the existing tag if one with that name already exists for that user, or creates and returns a new one.
- [ ] Given a user ID and tag name with different casing (e.g., "JavaScript" vs "javascript"), when `Tag.findOrCreate` is called, then the tag name is normalized to lowercase before storage and lookup.
- [ ] Given a user ID, when `Tag.findByUser(userId)` is called, then it returns all tags belonging to that user ordered by name ascending.
- [ ] Given a bookmark ID, when `Tag.findByBookmark(bookmarkId)` is called, then it returns all tags associated with that bookmark.
- [ ] Given a bookmark ID and tag ID, when `Tag.addToBookmark(bookmarkId, tagId)` is called, then a row is inserted into `bookmark_tags`. If the association already exists, it does not throw an error (idempotent).
- [ ] Given a bookmark ID and tag ID, when `Tag.removeFromBookmark(bookmarkId, tagId)` is called, then the corresponding row is deleted from `bookmark_tags`.

## Technical Notes

- Add the new `CREATE TABLE` statements to the `initSchema` function in `config/database.js` so that both production and test databases get the tables.
- The test file mock in `tests/bookmarks.test.js` manually creates tables — the new tables will need to be added there too (or the mock pattern refactored). This is addressed in task 002 when tests are first written.
- Follow the existing model pattern: class with static methods, `getDb()` for DB access.
- Tag name uniqueness should be per-user (a UNIQUE constraint on `(name, user_id)` in the `tags` table).
- File locations: `config/database.js` (schema), `src/models/Tag.js` (new model).
