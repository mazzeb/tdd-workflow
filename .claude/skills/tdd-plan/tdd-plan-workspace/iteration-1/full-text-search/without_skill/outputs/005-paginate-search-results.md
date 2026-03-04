---
status: pending
priority: high
depends-on:
  - 004-search-bookmarks-by-tags
---

# Paginate Search Results

## Description

Add pagination to the search endpoint. Users can specify `page` and `limit` query parameters to control which page of results they receive. The response should include pagination metadata so clients can navigate through result pages.

## Acceptance Criteria

- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=1&limit=2, when 5 matching bookmarks exist, then only the first 2 bookmarks are returned
- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=2&limit=2, when 5 matching bookmarks exist, then bookmarks 3 and 4 are returned
- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=3&limit=2, when 5 matching bookmarks exist, then only the 5th bookmark is returned
- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=1&limit=2, when 5 matching bookmarks exist, then the response includes `{ data: [...], pagination: { page: 1, limit: 2, total: 5, totalPages: 3 } }`
- [ ] Given a user sends GET /api/bookmarks/search?q=test without page or limit, when results exist, then defaults are applied (page=1, limit=20) and pagination metadata is included
- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=999, when fewer results exist, then an empty data array is returned with correct pagination metadata
- [ ] Given a user sends GET /api/bookmarks/search?q=test&limit=0, when the request is processed, then a 400 response is returned with error code `INVALID_PAGINATION`
- [ ] Given a user sends GET /api/bookmarks/search?q=test&limit=-1, when the request is processed, then a 400 response is returned with error code `INVALID_PAGINATION`
- [ ] Given a user sends GET /api/bookmarks/search?q=test&page=0, when the request is processed, then a 400 response is returned with error code `INVALID_PAGINATION`

## Technical Notes

- Add `page` and `limit` query parameter parsing in the search route handler
- Defaults: `page = 1`, `limit = 20`
- Validate that `page >= 1` and `limit >= 1` and `limit <= 100` (max cap)
- Use SQLite `LIMIT ? OFFSET ?` where offset = (page - 1) * limit
- Run a separate COUNT query (or use a CTE) to get the total matching count for pagination metadata
- The `search` method signature should accept `{ userId, query, page, limit }` and return `{ results, total }`
