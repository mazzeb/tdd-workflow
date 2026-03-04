---
status: pending
priority: low
depends-on: [001]
---

# 006 — List All Tags for a User

## Description

Add a new endpoint `GET /api/tags` that returns all tags belonging to the authenticated user. This supports UI features like tag autocomplete, tag clouds, and tag management views.

## Acceptance Criteria

- [ ] Given a user with tags "javascript", "python", and "tutorial", when `GET /api/tags` is called, then the response status is 200 and `response.body.data` is an array of tag objects containing all three tags.
- [ ] Given a user with no tags, when `GET /api/tags` is called, then the response status is 200 and `response.body.data` is an empty array.
- [ ] Given two users where user 1 has tag "javascript" and user 2 has tag "python", when user 1 calls `GET /api/tags`, then only "javascript" is returned (not "python").
- [ ] Given a valid auth token, when `GET /api/tags` is called, then each tag object in the response contains at least `id` and `name` properties.
- [ ] Given no auth token, when `GET /api/tags` is called, then the response status is 401.
- [ ] Given a user with tags, when `GET /api/tags` is called, then the tags are returned in alphabetical order by name.

## Technical Notes

- Create a new route file: `src/routes/tags.js` following the same pattern as `src/routes/bookmarks.js` and `src/routes/folders.js`.
- Register the route in `src/app.js`: `app.use('/api/tags', authenticate, tagRoutes);`.
- Use `Tag.findByUser(userId)` from the model created in task 001.
- Create a new test file: `tests/tags.test.js` following the same mock-DB pattern as `tests/bookmarks.test.js`, but include the `tags` and `bookmark_tags` table schemas.
