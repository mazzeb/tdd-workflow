---
status: pending
priority: high
depends-on: [001, 002]
---

# 003 — Return Tags with Bookmark Listings

## Description

Update the `GET /api/bookmarks` endpoint so that each bookmark in the response includes its associated tags. This ensures the client always has tag information when listing bookmarks, without needing a separate request.

## Acceptance Criteria

- [ ] Given a user with bookmarks that have tags, when `GET /api/bookmarks` is called, then each bookmark object in `response.body.data` includes a `tags` property that is an array of tag objects (`[{ id, name }]`).
- [ ] Given a user with a bookmark that has no tags, when `GET /api/bookmarks` is called, then that bookmark's `tags` property is an empty array `[]`.
- [ ] Given a user with multiple bookmarks where some have tags and some do not, when `GET /api/bookmarks` is called, then each bookmark correctly reflects its own tags (no cross-contamination between bookmarks).
- [ ] Given a bookmark with three tags ("javascript", "node", "express"), when `GET /api/bookmarks` is called, then all three tags are present in that bookmark's `tags` array.

## Technical Notes

- The simplest approach: after fetching bookmarks via `Bookmark.findByUser`, iterate and call `Tag.findByBookmark(bookmarkId)` for each bookmark. For a more efficient approach, a single query joining `bookmarks`, `bookmark_tags`, and `tags` could fetch all data, then group tags by bookmark in JavaScript.
- Start with the simple N+1 approach (correctness first), optimize later if needed.
- Modify `src/routes/bookmarks.js` GET handler to attach tags to each bookmark before returning.
- Ensure the existing `GET /api/bookmarks` tests in `tests/bookmarks.test.js` still pass (they expect `data` to be an array; now each item will also have a `tags` field).
