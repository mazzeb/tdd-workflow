# Tag Support for Bookmarks -- Planning Summary

## Created Tasks

| # | Title | Priority | Depends On |
|---|-------|----------|------------|
| 001 | Tag Model and Schema | high | -- |
| 002 | Add Tags When Creating a Bookmark | high | 001 |
| 003 | Filter Bookmarks by Tag | medium | 001, 002 |
| 004 | Remove Tags from a Bookmark | medium | 001, 002 |

## Dependency Graph

```
001 Tag Model and Schema
 |
 +---> 002 Add Tags When Creating a Bookmark
 |      |
 |      +---> 003 Filter Bookmarks by Tag
 |      |
 |      +---> 004 Remove Tags from a Bookmark
```

## Recommended Implementation Order

1. **001 -- Tag Model and Schema** (high priority, no dependencies): Establishes the `tags` table, `bookmark_tags` join table, and the `Tag` model with core static methods (`create`, `findByUser`, `findById`, `addToBookmark`, `findByBookmark`). Every other task depends on this foundation.

2. **002 -- Add Tags When Creating a Bookmark** (high priority, depends on 001): Extends `POST /api/bookmarks` to accept an optional `tags` array and includes tags in all bookmark responses (`GET` and `POST`). This is the primary user-facing entry point for tags.

3. **003 -- Filter Bookmarks by Tag** (medium priority, depends on 001, 002): Adds `?tag=` query parameter support to `GET /api/bookmarks`. Depends on 002 because bookmark responses should already include tags before we add filtering.

4. **004 -- Remove Tags from a Bookmark** (medium priority, depends on 001, 002): Adds `DELETE /api/bookmarks/:id/tags/:tagName` endpoint. Depends on 002 because tags must be addable before they can be removed.

Tasks 003 and 004 are independent of each other and can be worked on in parallel after 002 is complete.

## Design Decisions

- **Many-to-many via join table**: Tags and bookmarks have a many-to-many relationship through a `bookmark_tags` table with a composite primary key `(bookmark_id, tag_id)`.
- **Find-or-create semantics**: `Tag.create()` returns the existing tag if one with the same name already exists for the user, avoiding duplicates and simplifying the creation flow.
- **Tag name in URL, not ID**: The remove endpoint uses `DELETE /api/bookmarks/:id/tags/:tagName` with the tag name rather than tag ID, keeping the API user-friendly.
- **Backward compatible**: All changes are additive. The `tags` property in request bodies is optional, and responses include an empty `tags: []` array when no tags are present.
- **User isolation**: Tags are scoped per user via `user_id` on the `tags` table. Tag filtering respects user boundaries.

## Out of Scope

- Tag name validation (max length, allowed characters)
- Case-insensitive tag matching or normalization
- Multi-tag filtering (AND/OR logic on `GET /api/bookmarks`)
- Orphan tag cleanup when all associations are removed
- A standalone `/api/tags` resource endpoint (list all tags, rename tags, delete tags)
