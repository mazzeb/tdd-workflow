---
status: pending
priority: high
depends-on:
  - 002-search-bookmarks-by-title
---

# Search Bookmarks by URL

## Description

Extend the search endpoint to also match against bookmark URLs. A single search query should match against both title and URL fields, returning bookmarks where either field matches.

## Acceptance Criteria

- [ ] Given a user sends GET /api/bookmarks/search?q=github, when a bookmark with URL "https://github.com/repo" exists but its title is "My Project", then the bookmark is returned (URL match)
- [ ] Given a user sends GET /api/bookmarks/search?q=example, when one bookmark has title "Example" and another has URL "https://example.com" with title "My Site", then both bookmarks are returned (matches across both fields)
- [ ] Given a user sends GET /api/bookmarks/search?q=https, when multiple bookmarks have URLs starting with "https://", then all matching bookmarks are returned
- [ ] Given a user sends GET /api/bookmarks/search?q=test, when a bookmark has both title "Test Page" and URL "https://test.com", then it is returned only once (no duplicates)

## Technical Notes

- Modify the `search` method in Bookmark model to use `WHERE (title LIKE ? OR url LIKE ?)` with the same query parameter bound to both placeholders
- Ensure existing title-search tests still pass after extending the query
- No new route needed — this extends the existing search route behavior
