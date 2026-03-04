---
status: pending
priority: high
depends-on: [1]
---
# Add Tags When Creating a Bookmark

## Description
Extend the bookmark creation endpoint (`POST /api/bookmarks`) to accept an optional `tags` array of tag name strings. When tags are provided, each tag is created (or found if it already exists) and associated with the new bookmark. The bookmark response should include its associated tags. This gives users the ability to tag bookmarks at creation time.

## Acceptance Criteria
- [ ] Given an authenticated user, when `POST /api/bookmarks` is called with `{ url: 'https://example.com', title: 'Example', tags: ['javascript', 'tutorial'] }`, then the bookmark is created and both tags are associated with it, and the response status is 201
- [ ] Given an authenticated user, when `POST /api/bookmarks` is called with a `tags` array, then the response body `data` object includes a `tags` property containing an array of tag objects with `id` and `name` fields
- [ ] Given an authenticated user, when `POST /api/bookmarks` is called without a `tags` property, then the bookmark is created normally with an empty `tags` array in the response (backward compatible)
- [ ] Given an authenticated user, when `POST /api/bookmarks` is called with `tags: []` (empty array), then the bookmark is created with no tag associations and `tags: []` in the response
- [ ] Given a tag named 'javascript' already exists for the user, when `POST /api/bookmarks` is called with `tags: ['javascript']`, then the existing tag is reused (not duplicated) and associated with the new bookmark
- [ ] Given an authenticated user, when `GET /api/bookmarks` is called, then each bookmark in the response includes a `tags` array with its associated tag objects (id and name)

## Technical Notes
- Modify `src/routes/bookmarks.js` POST handler to extract `tags` from `req.body`
- Use `Tag.create()` (find-or-create) for each tag name, then `Tag.addToBookmark()` for each association
- Modify the GET handler and/or `Bookmark.findByUser()` to include tags in the response -- consider a `Tag.findByBookmark(bookmarkId)` call for each bookmark, or a join query
- Import `Tag` model in the bookmarks route file
- Wrap the bookmark creation + tag associations in a transaction for atomicity (use `db.transaction()` from better-sqlite3)

## Notes
- Tags array in the request body is optional for backward compatibility
- No validation on tag name format in this story (e.g., max length, allowed characters) -- keep it simple
