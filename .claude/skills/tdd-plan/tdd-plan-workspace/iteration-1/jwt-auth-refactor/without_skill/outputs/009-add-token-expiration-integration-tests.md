---
status: pending
priority: medium
depends-on: [006, 008]
---

# Add integration tests for token expiration behavior

## Description

Write integration tests that verify the full token lifecycle: access token expiration triggers a 401, the refresh endpoint issues new tokens, and expired refresh tokens are rejected. These tests exercise the end-to-end flow across middleware, routes, and the token service.

## Acceptance Criteria

- [ ] Given an expired access token, when a protected route (`GET /api/bookmarks`) is called, then the response is 401 with error code `TOKEN_EXPIRED`
- [ ] Given an expired access token and a valid refresh token, when the client calls `POST /api/auth/refresh`, then a new valid access token is returned that grants access to protected routes
- [ ] Given a refresh token that has been rotated (used once), when the old refresh token is used again at `POST /api/auth/refresh`, then it returns 401 with error code `INVALID_TOKEN`
- [ ] Given a user logs out, when the revoked refresh token is used at `POST /api/auth/refresh`, then it returns 401 with error code `INVALID_TOKEN`

## Technical Notes

- Create a new test file `tests/auth.test.js` for auth-specific integration tests.
- To test token expiration, either:
  - Generate tokens with very short expiry (e.g., `'1s'`) and use a small `setTimeout`/delay, or
  - Directly construct an already-expired token using `jsonwebtoken` with a past `exp`.
- Follow the existing test patterns: use `supertest`, mock the database with in-memory SQLite, and use the `{ data }` / `{ error }` response format assertions.
- The in-memory DB mock must include the `refresh_tokens` table.
