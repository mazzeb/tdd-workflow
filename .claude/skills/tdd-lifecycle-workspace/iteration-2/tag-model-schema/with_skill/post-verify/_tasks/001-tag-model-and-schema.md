---
status: done
priority: high
depends-on: []
---
# Tag Model and Schema

## Description
Introduce the database schema and model layer for tags. Tags are simple string labels that can be associated with bookmarks via a many-to-many relationship. This task creates the `tags` table (unique tag names per user), the `bookmark_tags` join table, and a `Tag` model with static methods following the same pattern as the existing `Bookmark` and `Folder` models. This is the foundational layer that all other tag stories depend on.

## Acceptance Criteria
- [x] Given the database is initialized, when `initSchema` runs in `config/database.js`, then a `tags` table exists with columns: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `name` (TEXT NOT NULL), `user_id` (INTEGER NOT NULL), and `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- [x] Given the database is initialized, when `initSchema` runs, then a unique constraint exists on `(name, user_id)` in the `tags` table so the same user cannot have duplicate tag names
- [x] Given the database is initialized, when `initSchema` runs, then a `bookmark_tags` table exists with columns: `bookmark_id` (INTEGER NOT NULL, FK to bookmarks.id), `tag_id` (INTEGER NOT NULL, FK to tags.id), and a primary key on `(bookmark_id, tag_id)`
- [x] Given a user with id 1, when `Tag.create({ name: 'javascript', userId: 1 })` is called, then a tag record is inserted and the returned object contains `id`, `name: 'javascript'`, and `user_id: 1`
- [x] Given a tag named 'javascript' already exists for user 1, when `Tag.create({ name: 'javascript', userId: 1 })` is called again, then the existing tag is returned instead of throwing a duplicate error
- [x] Given user 1 has tags 'javascript' and 'python', when `Tag.findByUser(1)` is called, then both tags are returned ordered alphabetically by name
- [x] Given a tag with id 5, when `Tag.findById(5)` is called, then the tag record is returned
- [x] Given a bookmark with id 10 and a tag with id 5, when `Tag.addToBookmark(bookmarkId: 10, tagId: 5)` is called, then a row is inserted into `bookmark_tags`
- [x] Given bookmark 10 already has tag 5, when `Tag.addToBookmark(bookmarkId: 10, tagId: 5)` is called again, then no error is thrown (idempotent operation)
- [x] Given bookmark 10 has tags 5 and 6, when `Tag.findByBookmark(10)` is called, then both tag records are returned

## Technical Notes
- Follow the existing model pattern in `src/models/Bookmark.js` and `src/models/Folder.js`: class with static methods, import `getDb` from `../../config/database`
- Create new file `src/models/Tag.js`
- Extend `initSchema()` in `config/database.js` to add the two new tables
- The test DB mock in `tests/bookmarks.test.js` also creates tables inline -- new test files for tags should follow the same mock pattern and include the new tables
- Use `INSERT OR IGNORE` or equivalent for idempotent `addToBookmark`
- Use `INSERT ... ON CONFLICT DO NOTHING` or a find-or-create pattern for `Tag.create` to handle the "return existing" behavior

## Notes
- Tag names should be stored as-is (no forced lowercase) -- normalization can be a future enhancement
- The `bookmark_tags` join table uses a composite primary key, not a separate auto-increment id
