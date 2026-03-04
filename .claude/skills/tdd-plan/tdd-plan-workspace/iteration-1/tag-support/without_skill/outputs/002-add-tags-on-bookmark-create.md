---
status: pending
priority: high
depends-on: [001]
---

# 002 — Add Tags When Creating a Bookmark

## Description

Extend the `POST /api/bookmarks` endpoint to accept an optional `tags` array in the request body. When tags are provided, each tag should be found-or-created and then associated with the newly created bookmark. The response should include the tags attached to the bookmark.

## Acceptance Criteria

- [ ] Given a valid auth token and a request body `{ url: "https://example.com", title: "Example", tags: ["javascript", "tutorial"] }`, when `POST /api/bookmarks` is called, then the response status is 201 and `response.body.data.tags` is an array containing objects with `name: "javascript"` and `name: "tutorial"`.
- [ ] Given a valid auth token and a request body with no `tags` field, when `POST /api/bookmarks` is called, then the bookmark is created successfully (status 201) and `response.body.data.tags` is an empty array.
- [ ] Given a valid auth token and a request body with `tags: []` (empty array), when `POST /api/bookmarks` is called, then the bookmark is created successfully (status 201) and `response.body.data.tags` is an empty array.
- [ ] Given a valid auth token and tags with mixed casing `["JavaScript", "TUTORIAL"]`, when `POST /api/bookmarks` is called, then the tags are stored and returned in lowercase (`"javascript"`, `"tutorial"`).
- [ ] Given a valid auth token and a tag name that already exists for this user, when `POST /api/bookmarks` is called with that tag, then the existing tag is reused (no duplicate tag rows created) and the bookmark-tag association is created.
- [ ] Given a valid auth token and a request body with `tags: "not-an-array"` (invalid type), when `POST /api/bookmarks` is called, then the response status is 400 with an appropriate error code (e.g., `INVALID_TAGS`).

## Technical Notes

- Modify `src/routes/bookmarks.js` POST handler to extract `tags` from `req.body`, validate it is an array (if present), and call `Tag.findOrCreate` + `Tag.addToBookmark` for each tag.
- The test mock in the test file needs to include the `tags` and `bookmark_tags` table schemas from task 001.
- Consider wrapping the bookmark creation + tag associations in a transaction for atomicity (using `db.transaction()`).
- Tags in the response should be returned as an array of objects `[{ id, name }]` on the `tags` property of the bookmark data.
