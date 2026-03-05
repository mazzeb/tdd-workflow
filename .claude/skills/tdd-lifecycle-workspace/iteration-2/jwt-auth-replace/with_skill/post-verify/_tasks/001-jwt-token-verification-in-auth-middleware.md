---
status: done
priority: high
depends-on: []
---
# Replace Base64 Auth with JWT Token Verification

## Description
The current `authenticate` middleware in `src/middleware/auth.js` extracts the user ID by base64-decoding the Bearer token. This provides no security -- anyone can forge a token by base64-encoding any user ID. Replace this with proper JWT verification using the `jsonwebtoken` library, including signature validation and expiration checking. This story also removes the old base64 approach from the auth middleware and updates existing tests to use JWT tokens instead of base64 tokens.

## Acceptance Criteria
- [x] Given a request with a valid JWT Bearer token (signed with the app secret, not expired), when the `authenticate` middleware runs, then `req.user` is set to `{ id: <userId> }` and `next()` is called
- [x] Given a request with an expired JWT token, when the `authenticate` middleware runs, then the response is 401 with `{ error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } }`
- [x] Given a request with a JWT token signed with the wrong secret, when the `authenticate` middleware runs, then the response is 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }`
- [x] Given a request with a malformed token (not valid JWT), when the `authenticate` middleware runs, then the response is 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }`
- [x] Given a request with no Authorization header, when the `authenticate` middleware runs, then the response is 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }`
- [x] [REMOVE] Base64 token decoding logic (`Buffer.from(token, 'base64').toString('utf-8')`) in `src/middleware/auth.js`
- [x] [REMOVE] Base64 token creation (`Buffer.from('1').toString('base64')`) in `tests/bookmarks.test.js` -- replace with JWT-signed tokens

## Technical Notes
- Add `jsonwebtoken` to `dependencies` in `package.json`
- The JWT secret should be read from `process.env.JWT_SECRET` with a fallback default for development
- Access tokens should have a configurable expiration (default: 15 minutes)
- The JWT payload should include `{ sub: userId }` following standard JWT claims
- Current auth middleware is at `src/middleware/auth.js` (line 1-21)
- The middleware is mounted in `src/app.js` on lines 15-16 for `/api/bookmarks` and `/api/folders`
- Existing tests in `tests/bookmarks.test.js` use `Buffer.from('1').toString('base64')` on line 29 to create tokens -- these must be updated to use `jwt.sign({ sub: 1 }, secret)`
- Consider exporting a `generateToken(userId)` helper from the auth module for use in tests and the login endpoint (story 002)

## Notes
- This is the foundational story -- all other JWT stories depend on this one
- The `authenticate` middleware signature and location stay the same so route wiring in `src/app.js` remains unchanged
- Keep the same 401 response shape `{ error: { code, message } }` to maintain API contract consistency
