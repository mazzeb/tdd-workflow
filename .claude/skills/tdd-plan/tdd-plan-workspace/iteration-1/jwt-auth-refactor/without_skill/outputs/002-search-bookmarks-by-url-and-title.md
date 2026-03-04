---
status: pending
priority: high
depends-on: [1]
---
# Search Bookmarks by URL and Title with Pagination

## Description
Add a search endpoint that lets users find bookmarks by matching a query string against the bookmark's URL and title fields. Results are paginated to handle large bookmark collections. This is the core search behavior — searching by tags is added in a follow-up story. The endpoint uses query parameters for the search term, page number, and page size.

## Acceptance Criteria
- [ ] Given bookmarks `[{url: "https://developer.mozilla.org", title: "MDN Web Docs"}, {url: "https://nodejs.org", title: "Node.js"}, {url: "https://expressjs.com", title: "Express Framework"}]` exist for user 1, when GET /api/bookmarks/search?q=node is called with user 1's auth token, then the response is 200 with `data` containing only the bookmark with title "Node.js" and `tags` included in the result
- [ ] Given bookmarks exist for user 1, when GET /api/bookmarks/search?q=express is called with user 1's auth token, then the response matches bookmarks where "express" appears in either the URL (expressjs.com) or the title ("Express Framework")
- [ ] Given the search is case-insensitive, when GET /api/bookmarks/search?q=NODE is called, then it returns the same results as searching for "node"
- [ ] Given 15 bookmarks match a search query, when GET /api/bookmarks/search?q=test is called without page params, then the response returns the first 10 results (default page size) and includes `pagination: { page: 1, pageSize: 10, totalCount: 15, totalPages: 2 }` in the response body
- [ ] Given 15 bookmarks match a search query, when GET /api/bookmarks/search?q=test&page=2 is called, then the response returns the remaining 5 results with `pagination: { page: 2, pageSize: 10, totalCount: 15, totalPages: 2 }`
- [ ] Given 15 bookmarks match a search query, when GET /api/bookmarks/search?q=test&page=1&pageSize=5 is called, then the response returns 5 results with `pagination: { page: 1, pageSize: 5, totalCount: 15, totalPages: 3 }`
- [ ] Given no bookmarks match the search query, when GET /api/bookmarks/search?q=nonexistent is called, then the response is 200 with `data: []` and `pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 }`
- [ ] Given a valid auth token, when GET /api/bookmarks/search is called without a `q` parameter, then the response is 400 with `error: { code: "MISSING_QUERY", message: "Search query is required" }`
- [ ] Given bookmarks exist for user 1 and user 2, when user 1 searches, then only user 1's bookmarks are searched and returned (user isolation)

## Technical Notes
- Add `Bookmark.search(userId, query, { page, pageSize })` static method in `src/models/Bookmark.js` using SQLite `LIKE '%query%'` on `url` and `title` columns with `OR`
- Use `LIMIT` and `OFFSET` for pagination: `OFFSET = (page - 1) * pageSize`
- Run a separate `COUNT(*)` query (or use a CTE) to get `totalCount` for the pagination metadata
- Add `GET /api/bookmarks/search` route in `src/routes/bookmarks.js` — place it before the `/:id` route to avoid conflict
- Parse `page` (default 1), `pageSize` (default 10) from `req.query`, coerce to integers
- Response shape: `{ data: [...bookmarks with tags...], pagination: { page, pageSize, totalCount, totalPages } }`
- Reuse the tag-attachment logic from story 001 to include tags in search results

## Notes
- SQLite LIKE is case-insensitive for ASCII by default, which covers this use case
- `pageSize` should be capped at a reasonable maximum (e.g., 100) to prevent abuse
- The search route must come before any `/:id` parameterized route in Express to avoid "search" being captured as an ID
