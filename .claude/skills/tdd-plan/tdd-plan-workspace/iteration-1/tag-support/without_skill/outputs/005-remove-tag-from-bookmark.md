---
status: pending
priority: medium
depends-on: [001, 002]
---

# 005 — Remove a Tag from a Bookmark

## Description

Add an endpoint to remove a specific tag from a specific bookmark. This allows users to manage their bookmark's tags after creation. The endpoint should follow REST conventions and ensure proper authorization (only the bookmark's owner can modify its tags).

## Acceptance Criteria

- [ ] Given a bookmark with the tag "javascript" owned by the authenticated user, when `DELETE /api/bookmarks/:id/tags/javascript` is called, then the response status is 204 and the tag association is removed from that bookmark.
- [ ] Given a bookmark with the tag "javascript" that is also used on other bookmarks, when `DELETE /api/bookmarks/:id/tags/javascript` is called, then only the association with this bookmark is removed; the tag itself still exists and other bookmarks retain it.
- [ ] Given a bookmark owned by the authenticated user, when `DELETE /api/bookmarks/:id/tags/nonexistent` is called with a tag that is not on this bookmark, then the response status is 404 with error code `TAG_NOT_FOUND`.
- [ ] Given a bookmark owned by a different user, when `DELETE /api/bookmarks/:id/tags/javascript` is called, then the response status is 404 with error code `NOT_FOUND` (same as existing bookmark-not-found behavior to avoid leaking resource existence).
- [ ] Given no auth token, when `DELETE /api/bookmarks/:id/tags/javascript` is called, then the response status is 401.
- [ ] Given a bookmark with tags "javascript" and "tutorial", when `DELETE /api/bookmarks/:id/tags/javascript` is called and then `GET /api/bookmarks` is called, then the bookmark's tags array contains only "tutorial".

## Technical Notes

- Add a new route: `DELETE /api/bookmarks/:id/tags/:tagName` in `src/routes/bookmarks.js`.
- Route handler flow: find bookmark by ID, verify ownership, find tag by name for user, check bookmark-tag association exists, call `Tag.removeFromBookmark`.
- Normalize `:tagName` parameter to lowercase for lookup.
- This endpoint removes the bookmark-tag association only, not the tag record itself. Orphan tag cleanup is out of scope.
