---
status: pending
priority: high
depends-on: []
---
# Add Tags to Bookmarks

## Description
Introduce a tagging system for bookmarks so users can categorize and later search by tags. This is a prerequisite for full-text search across tags. A bookmark can have zero or more tags, and the same tag string can be applied to multiple bookmarks (many-to-many). Tags are stored as a separate table with a join table linking them to bookmarks. When creating a bookmark, the user can optionally pass an array of tag strings. When retrieving bookmarks, the response includes each bookmark's tags.

## Acceptance Criteria
- [ ] Given the database schema, when the application starts, then a `tags` table exists with columns `id` (INTEGER PRIMARY KEY) and `name` (TEXT UNIQUE NOT NULL), and a `bookmark_tags` table exists with columns `bookmark_id` (INTEGER, FK to bookmarks.id) and `tag_id` (INTEGER, FK to tags.id) with a unique constraint on the pair
- [ ] Given a valid auth token, when POST /api/bookmarks is called with `{ url: "https://example.com", title: "Example", tags: ["javascript", "tutorial"] }`, then the response is 201 with the bookmark data including a `tags` array containing `["javascript", "tutorial"]`
- [ ] Given a valid auth token, when POST /api/bookmarks is called with `{ url: "https://example.com", title: "Example" }` (no tags field), then the response is 201 with the bookmark data including an empty `tags` array `[]`
- [ ] Given a bookmark exists with tags `["javascript", "tutorial"]` and another bookmark is created with tags `["javascript", "react"]`, when the tags table is queried, then the tag `"javascript"` has only one row (tags are reused, not duplicated)
- [ ] Given bookmarks exist for user 1, when GET /api/bookmarks is called with user 1's auth token, then each bookmark in the response includes a `tags` array of strings
- [ ] Given a bookmark with tags exists, when DELETE /api/bookmarks/:id is called, then the bookmark is deleted and its entries in `bookmark_tags` are also removed

## Technical Notes
- Add `tags` and `bookmark_tags` tables to `initSchema()` in `config/database.js`
- Extend `Bookmark.create()` in `src/models/Bookmark.js` to accept a `tags` array, insert into `tags` (using INSERT OR IGNORE for dedup), and insert into `bookmark_tags`
- Extend `Bookmark.findByUser()` and `Bookmark.findById()` to join with `bookmark_tags` and `tags` to include tags in the result — consider a helper method like `_attachTags(bookmarks)` that takes bookmark rows and attaches tag arrays
- Update `Bookmark.delete()` to also delete from `bookmark_tags` (or rely on CASCADE if added to the FK)
- Update `src/routes/bookmarks.js` POST handler to pass `tags` from `req.body` to `Bookmark.create()`
- Update the test mock in `tests/bookmarks.test.js` to include the new tables in the in-memory DB schema

## Notes
- Tag names should be stored lowercase and trimmed for consistency
- No separate CRUD endpoints for tags in this story — tags are managed inline with bookmarks
- The existing test mock creates its own schema inline — the new tables need to be added there too
