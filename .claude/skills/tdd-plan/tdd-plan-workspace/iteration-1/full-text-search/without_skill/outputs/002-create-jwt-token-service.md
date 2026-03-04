---
status: pending
priority: high
depends-on: [001]
---

# Create JWT token service for signing and verifying tokens

## Description

Build a `src/services/token.js` module that encapsulates all JWT operations: generating access tokens, generating refresh tokens, and verifying tokens. This isolates the `jsonwebtoken` library usage to one place and provides a clean interface for the rest of the application.

## Acceptance Criteria

- [ ] Given a user payload `{ id: 1 }`, when `generateAccessToken({ id: 1 })` is called, then it returns a signed JWT string that decodes to contain `{ id: 1 }` with an `exp` claim
- [ ] Given a user payload `{ id: 1 }`, when `generateRefreshToken({ id: 1 })` is called, then it returns a signed JWT string using the refresh secret, distinct from the access token secret
- [ ] Given a valid access token, when `verifyAccessToken(token)` is called, then it returns the decoded payload containing the user's `id`
- [ ] Given an expired access token, when `verifyAccessToken(token)` is called, then it throws or returns an error indicating token expiration
- [ ] Given a tampered/invalid token, when `verifyAccessToken(token)` is called, then it throws or returns an error indicating an invalid token
- [ ] Given a valid refresh token, when `verifyRefreshToken(token)` is called, then it returns the decoded payload containing the user's `id`
- [ ] Given an expired refresh token, when `verifyRefreshToken(token)` is called, then it throws or returns an error indicating token expiration

## Technical Notes

- Follow the existing project convention of a module exporting functions (similar to how models export a class with static methods).
- Use the config from `config/jwt.js` (task 001) for secrets and expiry values.
- The service should be purely functional -- no database calls. Database-backed refresh token storage is a separate task.
- Consider including `iat` (issued at) in payloads for debugging.
