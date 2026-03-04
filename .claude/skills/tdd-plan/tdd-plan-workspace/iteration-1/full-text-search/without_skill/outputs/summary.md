# Full-Text Search Feature — Task Plan Summary

## Feature Request

"Add full-text search across bookmarks — search by URL, title, and tags, with pagination"

## Codebase Analysis

The bookmark manager is an Express API using SQLite (better-sqlite3) with Jest + supertest for testing. Key observations that shaped the plan:

- **No tags exist yet.** The schema has only `bookmarks` and `folders` tables. Tags must be built from scratch before they can be searched.
- **No search endpoint exists.** All current routes are simple CRUD: list-all, create, delete.
- **No pagination exists anywhere.** GET /api/bookmarks returns all results in a flat array.
- **Conventions:** Routes return `{ data: ... }` on success, `{ error: { code, message } }` on failure. Models are classes with static methods. Auth is Bearer token-based.

## Task Breakdown (6 tasks)

### 001 — Add Tags to Bookmarks (high priority, no dependencies)
Creates the `tags` and `bookmark_tags` tables, extends `Bookmark.create()` to accept tags, and updates all read methods to include tags in responses. This is a prerequisite for tag-based search but is independently useful.

### 002 — Search Bookmarks by Title (high priority, no dependencies)
Introduces the `GET /api/bookmarks/search?q=` endpoint with the simplest field match: title. Establishes the search route, query validation, user scoping, and response format. Can be built in parallel with task 001.

### 003 — Search Bookmarks by URL (high priority, depends on 002)
Extends the search query to match against both title and URL fields using an OR condition. Small incremental change on top of the existing search method.

### 004 — Search Bookmarks by Tags (high priority, depends on 001, 003)
The convergence point: extends search to JOIN against the tags tables and match on tag names in addition to title and URL. Handles deduplication and ensures tags appear in search results.

### 005 — Paginate Search Results (high priority, depends on 004)
Adds `page` and `limit` query parameters to the search endpoint with validation, defaults, and pagination metadata in the response (`{ data, pagination: { page, limit, total, totalPages } }`).

### 006 — Paginate Bookmarks Listing (medium priority, depends on 005)
Applies the same pagination pattern to the existing `GET /api/bookmarks` listing endpoint. Extracts shared pagination logic for reuse.

## Dependency Graph

```
001-add-tags-to-bookmarks ─────────────────┐
                                            ├──→ 004-search-by-tags → 005-paginate-search → 006-paginate-listing
002-search-by-title → 003-search-by-url ───┘
```

Tasks 001 and 002 can be worked on in parallel since they touch independent parts of the codebase. They converge at task 004 where tag search requires both the tags infrastructure and the search endpoint.

## Design Decisions

1. **Vertical slicing by search field** — Each search field (title, URL, tags) is its own task rather than building all search in one go. This keeps each task small and independently testable.

2. **Tags before tag search** — Task 001 is separated from the search feature because tagging is a standalone capability. It can be tested and verified independently.

3. **Pagination split from search** — Pagination is its own task because it adds distinct query parsing, validation, metadata, and count queries. Mixing it with the search-field tasks would make each task too large.

4. **Listing pagination last** — Applying pagination to the existing listing endpoint is lower priority and reuses patterns established in search pagination, making it a clean final task.

5. **SQLite LIKE for initial implementation** — Rather than introducing SQLite FTS5 (full-text search extension), the plan uses `LIKE '%query%'` which is simpler, requires no schema migration complexity, and is sufficient for the scale implied by a bookmark manager. FTS5 could be a future optimization.
