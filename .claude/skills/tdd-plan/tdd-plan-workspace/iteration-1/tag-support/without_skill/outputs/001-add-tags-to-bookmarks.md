---
status: pending
priority: high
depends-on: []
---

# Add Tags to Bookmarks

## Description

Introduce a tagging system for bookmarks. A bookmark can have zero or more tags. Tags are stored in a separate `tags` table with a join table `bookmark_tags` linking them. The Bookmark model should support creating, reading, and deleting tag associations when creating or retrieving bookmarks.

## Acceptance Criteria

- [ ] Given the database schema is initialized, when the app starts, then a `tags` table exists with columns `id` (INTEGER PK), `name` (TEXT UNIQUE NOT NULL), and `user_id` (INTEGER NOT NULL)
- [ ] Given the database schema is initialized, when the app starts, then a `bookmark_tags` join table exists with columns `bookmark_id` (INTEGER FK) and `tag_id` (INTEGER FK), with a unique constraint on the pair
- [ ] Given a user sends POST /api/bookmarks with `{ url, title, tags: ["javascript", "tutorial"] }`, when the request succeeds, then the bookmark is created and the tags are associated with it
- [ ] Given a user sends POST /api/bookmarks with tags that already exist, when the request succeeds, then existing tags are reused rather than duplicated
- [ ] Given a user sends GET /api/bookmarks, when bookmarks exist with tags, then each bookmark in the response includes a `tags` array of tag name strings
- [ ] Given a user sends POST /api/bookmarks without a `tags` field, when the request succeeds, then the bookmark is created with an empty `tags` array

## Technical Notes

- Add `tags` and `bookmark_tags` table creation to `initSchema()` in `config/database.js`
- Update the test mock in `tests/bookmarks.test.js` to include the new tables
- Use a transaction in `Bookmark.create()` when inserting tags to ensure atomicity
- Tags should be case-insensitive (store lowercase)
- The `findByUser` and `findById` methods should JOIN to return tags with each bookmark
