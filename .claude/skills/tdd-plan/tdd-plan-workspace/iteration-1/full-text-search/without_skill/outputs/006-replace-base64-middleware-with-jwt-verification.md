---
status: pending
priority: high
depends-on: [002]
---

# Replace base64 token middleware with JWT verification

## Description

Rewrite `src/middleware/auth.js` to verify JWT access tokens instead of decoding base64 strings. The middleware must validate the JWT signature, check expiration, and extract the user ID from the token payload. This is the core swap that transitions the entire API from base64 to JWT authentication.

## Acceptance Criteria

- [ ] [REMOVE] Given the auth middleware, when its source code is inspected, then there is no `Buffer.from(token, 'base64')` call or any base64 decoding logic
- [ ] Given a valid, non-expired JWT access token in the Authorization header, when a protected route is accessed, then the request proceeds with `req.user.id` set to the user ID from the token payload
- [ ] Given an expired JWT access token, when a protected route is accessed, then it returns 401 with `{ error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired' } }`
- [ ] Given a JWT signed with the wrong secret, when a protected route is accessed, then it returns 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }`
- [ ] Given no Authorization header, when a protected route is accessed, then it returns 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }`
- [ ] Given an Authorization header that does not start with `Bearer `, when a protected route is accessed, then it returns 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }`

## Technical Notes

- The middleware should use `verifyAccessToken` from the token service (task 002).
- The existing `req.user = { id: ... }` contract must be preserved so downstream routes (bookmarks, folders) continue working without changes.
- Differentiate between expired tokens (`TOKEN_EXPIRED`) and invalid tokens (`UNAUTHORIZED`) so clients know when to attempt a refresh vs. re-login.
- This task replaces the implementation but keeps the same module path (`src/middleware/auth.js`) and export name (`authenticate`).
