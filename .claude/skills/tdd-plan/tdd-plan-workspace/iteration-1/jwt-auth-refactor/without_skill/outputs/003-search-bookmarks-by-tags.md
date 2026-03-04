---
status: pending
priority: medium
depends-on: [1, 2]
---
# Include Tags in Search Results

## Description
Extend the search endpoint to also match bookmarks by their tags. When a user searches for "javascript", bookmarks that have a tag "javascript" should appear in the results even if "javascript" does not appear in their URL or title. This completes the full-text search feature by covering all three searchable fields: URL, title, and tags.

## Acceptance Criteria
- [ ] Given a bookmark `{url: "https://react.dev", title: "React", tags: ["javascript", "frontend"]}` exists, when GET /api/bookmarks/search?q=javascript is called, then the bookmark is included in the results because the tag "javascript" matches the query
- [ ] Given a bookmark `{url: "https://react.dev", title: "React", tags: ["javascript", "frontend"]}` exists, when GET /api/bookmarks/search?q=react is called, then the bookmark is included in the results because the title "React" matches (existing URL/title search still works)
- [ ] Given a bookmark matches on both title and tag (e.g., title contains "javascript" and tag is "javascript"), when the search is performed, then the bookmark appears only once in the results (no duplicates)
- [ ] Given bookmark A has tag "tutorial" and bookmark B has title "Tutorial Guide", when GET /api/bookmarks/search?q=tutorial is called, then both bookmarks appear in the results with correct pagination metadata reflecting the total unique matches
- [ ] Given tag-based search results span multiple pages, when GET /api/bookmarks/search?q=frontend&page=2 is called, then pagination works correctly with totalCount reflecting unique matching bookmarks (not inflated by join duplicates)

## Technical Notes
- Modify `Bookmark.search()` in `src/models/Bookmark.js` to JOIN with `bookmark_tags` and `tags` tables and add `OR tags.name LIKE '%query%'` to the WHERE clause
- Use `SELECT DISTINCT bookmarks.*` or `GROUP BY bookmarks.id` to prevent duplicate rows when a bookmark matches on multiple criteria or has multiple matching tags
- The `COUNT(*)` for pagination must also account for deduplication — use a subquery or `COUNT(DISTINCT bookmarks.id)`
- The existing LIKE-based search on URL and title from story 002 should be extended with a LEFT JOIN to include bookmarks that match on tags

## Notes
- Tag matching uses the same LIKE pattern as URL/title matching — partial matches on tag names are included (e.g., searching "java" matches tag "javascript")
- The LEFT JOIN is important: bookmarks without tags should still be searchable by URL and title
