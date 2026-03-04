---
status: pending
priority: medium
depends-on:
  - 005-paginate-search-results
---

# Paginate Bookmarks Listing

## Description

Apply the same pagination pattern from the search endpoint to the main GET /api/bookmarks listing endpoint. This ensures consistent pagination behavior across the API and allows clients to page through large bookmark collections.

## Acceptance Criteria

- [ ] Given a user sends GET /api/bookmarks?page=1&limit=2, when 5 bookmarks exist for that user, then only the first 2 bookmarks are returned with pagination metadata
- [ ] Given a user sends GET /api/bookmarks?page=2&limit=2, when 5 bookmarks exist, then bookmarks 3 and 4 are returned with pagination metadata
- [ ] Given a user sends GET /api/bookmarks without page or limit, when bookmarks exist, then defaults are applied (page=1, limit=20) and pagination metadata is included
- [ ] Given a user sends GET /api/bookmarks?page=1&limit=2, when the response is returned, then it includes `{ data: [...], pagination: { page: 1, limit: 2, total: 5, totalPages: 3 } }`
- [ ] Given a user sends GET /api/bookmarks?limit=0, when the request is processed, then a 400 response is returned with error code `INVALID_PAGINATION`
- [ ] Given a user sends GET /api/bookmarks?page=0, when the request is processed, then a 400 response is returned with error code `INVALID_PAGINATION`

## Technical Notes

- Reuse the same pagination validation logic from the search endpoint — consider extracting a `parsePagination(query)` helper in a shared utility or middleware
- Update `Bookmark.findByUser` to accept optional `{ page, limit }` and return `{ results, total }`
- Maintain backward compatibility: if called without pagination params, use defaults
- Update existing tests that rely on the current `{ data: [...] }` response shape — they now need to account for the `pagination` field
