---
status: pending
priority: medium
depends-on: [1, 2]
---
# Remove Tags from a Bookmark

## Description
Add the ability to remove a tag association from a bookmark. This is exposed as a `DELETE /api/bookmarks/:id/tags/:tagName` endpoint. Removing a tag association does not delete the tag itself (it may be used by other bookmarks). This completes the tag lifecycle by allowing users to correct or update their tag assignments.

## Acceptance Criteria
- [ ] Given bookmark 1 has tag 'javascript' associated, when `DELETE /api/bookmarks/1/tags/javascript` is called by the bookmark's owner, then the association is removed and the response status is 204
- [ ] Given bookmark 1 had tag 'javascript' removed, when `GET /api/bookmarks` is called, then bookmark 1's `tags` array no longer includes 'javascript'
- [ ] Given bookmark 1 does not have tag 'rust' associated, when `DELETE /api/bookmarks/1/tags/rust` is called, then the response status is 204 (idempotent -- no error for removing a non-existent association)
- [ ] Given bookmark 1 belongs to user 1, when user 2 calls `DELETE /api/bookmarks/1/tags/javascript`, then the response is 404 with error code 'NOT_FOUND' (ownership check)
- [ ] Given an unauthenticated request, when `DELETE /api/bookmarks/1/tags/javascript` is called without a Bearer token, then the response is 401

## Technical Notes
- Add a new route in `src/routes/bookmarks.js`: `router.delete('/:id/tags/:tagName', ...)`
- Add `Tag.removeFromBookmark(bookmarkId, tagName)` static method in `src/models/Tag.js` that deletes from `bookmark_tags` by joining on the tag name: `DELETE FROM bookmark_tags WHERE bookmark_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ? AND user_id = ?)`
- Reuse the existing ownership check pattern from the `DELETE /api/bookmarks/:id` handler: find the bookmark by id, verify `bookmark.userId === req.user.id`
- The route uses `tagName` (the tag's string name) rather than `tagId` to keep the API user-friendly

## Notes
- Deleting the last association of a tag does not delete the tag record itself -- orphan tag cleanup is out of scope
- The endpoint is nested under bookmarks (`/api/bookmarks/:id/tags/:tagName`) rather than a top-level `/api/tags` resource, because the operation is "remove tag from this bookmark"
