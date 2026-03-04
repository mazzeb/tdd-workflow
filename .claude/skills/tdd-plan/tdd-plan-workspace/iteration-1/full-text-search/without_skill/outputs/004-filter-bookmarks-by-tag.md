---
status: pending
priority: medium
depends-on: [001, 003]
---

# 004 — Filter Bookmarks by Tag

## Description

Add query parameter support to `GET /api/bookmarks` so that users can filter their bookmarks by tag name. When a `tag` query parameter is provided, only bookmarks associated with that tag (for the authenticated user) should be returned.

## Acceptance Criteria

- [ ] Given a user with bookmarks tagged "javascript" and bookmarks tagged "python", when `GET /api/bookmarks?tag=javascript` is called, then only bookmarks tagged "javascript" are returned.
- [ ] Given a user with bookmarks tagged "javascript", when `GET /api/bookmarks?tag=JAVASCRIPT` is called (uppercase), then the filter is case-insensitive and the "javascript" bookmarks are returned.
- [ ] Given a user with bookmarks, when `GET /api/bookmarks?tag=nonexistent` is called with a tag that has no matching bookmarks, then the response status is 200 and `response.body.data` is an empty array.
- [ ] Given a user with bookmarks, when `GET /api/bookmarks` is called without a `tag` query parameter, then all bookmarks are returned (existing behavior is preserved).
- [ ] Given a bookmark that has multiple tags including "javascript", when `GET /api/bookmarks?tag=javascript` is called, then that bookmark is returned and its `tags` array still includes all of its tags (not just the filtered one).

## Technical Notes

- Add a model method like `Bookmark.findByTag(tagName, userId)` or `Tag.getBookmarksByTag(tagName, userId)` that performs a JOIN query across `bookmarks`, `bookmark_tags`, and `tags`.
- In the route handler, check for `req.query.tag`. If present, use the tag-filtered query; otherwise use the existing `Bookmark.findByUser`.
- Normalize the query parameter to lowercase before lookup to match the stored lowercase tag names.
- Each returned bookmark should still include its full `tags` array (from task 003).
