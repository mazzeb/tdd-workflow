---
status: pending
priority: medium
depends-on: [1, 2]
---
# Filter Bookmarks by Tag

## Description
Extend the `GET /api/bookmarks` endpoint to support filtering by tag name via a query parameter. When a `tag` query parameter is provided, only bookmarks associated with that tag (for the authenticated user) are returned. This allows users to retrieve a focused subset of their bookmarks.

## Acceptance Criteria
- [ ] Given user 1 has bookmark A tagged 'javascript' and bookmark B tagged 'python', when `GET /api/bookmarks?tag=javascript` is called, then only bookmark A is returned in the `data` array
- [ ] Given user 1 has bookmark A tagged both 'javascript' and 'tutorial', when `GET /api/bookmarks?tag=javascript` is called, then bookmark A is returned (a bookmark with multiple tags matches when any tag matches)
- [ ] Given user 1 has no bookmarks tagged 'rust', when `GET /api/bookmarks?tag=rust` is called, then the response is 200 with `data: []` (empty array, not an error)
- [ ] Given user 1 has bookmarks with various tags, when `GET /api/bookmarks` is called without a `tag` query parameter, then all bookmarks are returned as before (backward compatible)
- [ ] Given user 1 has a bookmark tagged 'javascript' and user 2 also has a bookmark tagged 'javascript', when user 1 calls `GET /api/bookmarks?tag=javascript`, then only user 1's bookmarks are returned (tag filtering respects user isolation)

## Technical Notes
- Modify `src/routes/bookmarks.js` GET handler to read `req.query.tag`
- Add a new static method `Bookmark.findByTag(tagName, userId)` in `src/models/Bookmark.js` that performs a JOIN query across `bookmarks`, `bookmark_tags`, and `tags` tables: `SELECT bookmarks.* FROM bookmarks INNER JOIN bookmark_tags ON ... INNER JOIN tags ON ... WHERE tags.name = ? AND bookmarks.user_id = ?`
- Alternatively, add this as `Tag.findBookmarksByTag(tagName, userId)` in the Tag model -- either approach works, but `Bookmark.findByTag` keeps the query close to the Bookmark model
- The filtered results should still include the `tags` array on each bookmark (consistent with task 002)

## Notes
- Only single-tag filtering is required for now -- multi-tag filtering (AND/OR) is out of scope
- Tag matching should be exact (case-sensitive) for now
