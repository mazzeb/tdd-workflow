# Tag Support — TDD Task Plan Summary

## Feature Request

"Add tag support for bookmarks — users should be able to add tags when creating a bookmark, filter bookmarks by tag, and remove tags."

## Codebase Analysis

The project is a bookmark manager Express API using:
- **Runtime**: Node.js + Express
- **Database**: SQLite via better-sqlite3 (synchronous API)
- **Testing**: Jest + supertest with in-memory SQLite mocks
- **Conventions**: `{ data: ... }` response wrapper, `{ error: { code, message } }` for errors, Bearer token auth, model classes with static methods

Existing entities: `Bookmark` (CRUD with folder association) and `Folder` (hierarchical). The tag feature requires a new entity (`Tag`) with a many-to-many relationship to bookmarks.

## Task Breakdown

### 001 — Tag Schema and Model (High Priority)
**Foundation task.** Creates the `tags` and `bookmark_tags` database tables and a `Tag` model class with `findOrCreate`, `findByUser`, `findByBookmark`, `addToBookmark`, and `removeFromBookmark` static methods. All subsequent tasks depend on this. Tag names are normalized to lowercase and unique per user.

- 8 acceptance criteria
- Files: `config/database.js`, `src/models/Tag.js` (new)

### 002 — Add Tags When Creating a Bookmark (High Priority, depends on 001)
**First integration point.** Extends `POST /api/bookmarks` to accept an optional `tags` array in the request body. Tags are found-or-created and associated with the new bookmark. Includes validation for the tags field type.

- 6 acceptance criteria
- Files: `src/routes/bookmarks.js`, test file

### 003 — Return Tags with Bookmark Listings (High Priority, depends on 001, 002)
**Read-side integration.** Updates `GET /api/bookmarks` to include a `tags` array on each bookmark object. Ensures existing tests continue to pass and bookmarks without tags return an empty array.

- 4 acceptance criteria
- Files: `src/routes/bookmarks.js`, test file

### 004 — Filter Bookmarks by Tag (Medium Priority, depends on 001, 003)
**Query enhancement.** Adds `?tag=name` query parameter support to `GET /api/bookmarks`. Case-insensitive filtering. Unmatched tags return an empty array rather than an error. Each returned bookmark still includes its full tags array.

- 5 acceptance criteria
- Files: `src/routes/bookmarks.js`, `src/models/Bookmark.js` or `src/models/Tag.js`, test file

### 005 — Remove a Tag from a Bookmark (Medium Priority, depends on 001, 002)
**Tag management.** Adds `DELETE /api/bookmarks/:id/tags/:tagName` endpoint. Removes only the bookmark-tag association, not the tag itself. Includes ownership verification and proper error codes.

- 6 acceptance criteria
- Files: `src/routes/bookmarks.js`, test file

### 006 — List All Tags for a User (Low Priority, depends on 001)
**Discovery endpoint.** Adds `GET /api/tags` returning all tags for the authenticated user. Supports tag autocomplete and management UIs. Requires a new route file and app registration.

- 6 acceptance criteria
- Files: `src/routes/tags.js` (new), `src/app.js`, `tests/tags.test.js` (new)

## Dependency Graph

```
001 Tag Schema & Model
 |
 +---> 002 Add Tags on Create
 |      |
 |      +---> 003 Return Tags with Listings
 |      |      |
 |      |      +---> 004 Filter by Tag
 |      |
 |      +---> 005 Remove Tag from Bookmark
 |
 +---> 006 List All Tags
```

## Totals

- **6 tasks** total
- **35 acceptance criteria** across all tasks
- **Suggested execution order**: 001 -> 002 -> 003 -> 004 -> 005 -> 006 (005 and 006 can run in parallel after their dependencies are met)
