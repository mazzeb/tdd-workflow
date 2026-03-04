---
status: pending
priority: high
depends-on: []
---

# Search Bookmarks by Title

## Description

Add a search endpoint that allows users to find bookmarks by matching a query string against bookmark titles. This is the first slice of the full-text search feature, handling the simplest searchable field. The search should be case-insensitive and match partial strings.

## Acceptance Criteria

- [ ] Given a user sends GET /api/bookmarks/search?q=example, when bookmarks with "Example Site" and "Another Page" exist, then only the bookmark with "Example Site" is returned in `{ data: [...] }`
- [ ] Given a user sends GET /api/bookmarks/search?q=EXAMPLE, when a bookmark titled "example site" exists, then it is returned (case-insensitive matching)
- [ ] Given a user sends GET /api/bookmarks/search?q=site, when bookmarks titled "My Site" and "Your Site" exist, then both are returned (partial match)
- [ ] Given a user sends GET /api/bookmarks/search without a `q` parameter, when the request is processed, then a 400 response is returned with error code `MISSING_QUERY`
- [ ] Given a user sends GET /api/bookmarks/search?q=nonexistent, when no bookmarks match, then an empty array is returned in `{ data: [] }`
- [ ] Given two users exist and user A searches, when user B has matching bookmarks, then only user A's bookmarks are returned (user scoping)
- [ ] Given a user sends GET /api/bookmarks/search?q=example without an auth token, when the request is processed, then a 401 response is returned

## Technical Notes

- Add a `search` static method to the Bookmark model that accepts `userId` and `query` parameters
- Use SQLite `LIKE '%query%'` for initial implementation (case-insensitive by default in SQLite for ASCII)
- Add a new GET route at `/api/bookmarks/search` — define it BEFORE the `/:id` route to avoid route conflicts
- Follow existing `{ data: [...] }` response wrapper convention
