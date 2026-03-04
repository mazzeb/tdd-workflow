# Full-Text Search Planning Summary

## Feature
Add full-text search across bookmarks -- search by URL, title, and tags, with pagination.

## Created Tasks

| # | Title | Priority | Depends On |
|---|-------|----------|------------|
| 001 | Add Tags to Bookmarks | high | -- |
| 002 | Search Bookmarks by URL and Title with Pagination | high | 001 |
| 003 | Include Tags in Search Results | medium | 001, 002 |

## Dependency Graph

```
001 Add Tags to Bookmarks
 |
 +---> 002 Search Bookmarks by URL and Title with Pagination
 |      |
 +------+---> 003 Include Tags in Search Results
```

## Recommended Implementation Order

1. **001 — Add Tags to Bookmarks** (high priority, no dependencies)
   Foundation: introduces the `tags` and `bookmark_tags` tables, extends bookmark creation to accept tags, and updates retrieval to include tags in responses. Without this, tag-based search has nothing to search against.

2. **002 — Search Bookmarks by URL and Title with Pagination** (high priority, depends on 001)
   Core search: adds the `GET /api/bookmarks/search?q=...&page=...&pageSize=...` endpoint that searches across URL and title fields with paginated results. Depends on 001 because search results should include tags in the response.

3. **003 — Include Tags in Search Results** (medium priority, depends on 001 and 002)
   Completes the feature: extends the search query to also match against tag names via a JOIN, with deduplication to avoid duplicate results when a bookmark matches on multiple fields.

## Codebase Observations

- **No tags system exists yet** — the current schema only has `bookmarks` and `folders` tables
- **SQLite LIKE is case-insensitive for ASCII** — simplifies the search implementation without needing FTS extensions
- **Test mock creates schema inline** in `tests/bookmarks.test.js` — new tables must be added to the mock as well as to `config/database.js`
- **Express route ordering matters** — the `/search` route must be registered before `/:id` in `src/routes/bookmarks.js`
- **Response conventions are established** — `{ data: ... }` for success, `{ error: { code, message } }` for errors; the pagination metadata sits alongside `data` in the response

## Open Questions / Deferred Decisions

- **Full-text search (FTS5)**: SQLite supports FTS5 for better performance on large datasets. The current plan uses simple LIKE queries which are sufficient for moderate bookmark collections. FTS5 could be added later as a performance optimization if needed.
- **Tag management endpoints**: This plan handles tags as part of bookmark CRUD only. Dedicated endpoints for listing all tags, renaming tags, or deleting orphaned tags are out of scope and could be a separate feature.
- **Pagination on existing GET /api/bookmarks**: The current listing endpoint returns all bookmarks without pagination. Adding pagination there would be a natural follow-up but is not part of this search feature request.
