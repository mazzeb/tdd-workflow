---
status: pending
priority: high
depends-on: [1, 2]
---
# Refresh Token Endpoint

## Description
Add a `POST /auth/refresh` endpoint that accepts a refresh token and issues a new access token. This enables clients to obtain fresh access tokens without requiring the user to re-enter credentials when their short-lived access token expires. The endpoint should also support refresh token rotation for security -- issuing a new refresh token and invalidating the old one.

## Acceptance Criteria
- [ ] Given a valid, non-expired refresh token in the request body `{ "refreshToken": "<token>" }`, when POST /auth/refresh is called, then the response is 200 with `{ data: { accessToken: "<new-jwt>", refreshToken: "<new-refresh-token>" } }`
- [ ] Given a valid refresh token, when POST /auth/refresh is called, then the returned `accessToken` is a valid JWT with `{ sub: <userId> }` and a fresh expiration claim
- [ ] Given a valid refresh token, when POST /auth/refresh succeeds, then the old refresh token is invalidated (deleted from the database) and cannot be reused
- [ ] Given an expired refresh token, when POST /auth/refresh is called, then the response is 401 with `{ error: { code: 'TOKEN_EXPIRED', message: 'Refresh token has expired' } }`
- [ ] Given a refresh token that does not exist in the database, when POST /auth/refresh is called, then the response is 401 with `{ error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } }`
- [ ] Given a POST /auth/refresh request with no refreshToken in the body, when the endpoint processes the request, then the response is 400 with `{ error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' } }`

## Technical Notes
- Add the endpoint to `src/routes/auth.js` (created in story 002)
- This is a public route (no `authenticate` middleware) since the user's access token may be expired
- Reuse the `generateToken(userId)` helper from `src/middleware/auth.js` (added in story 001) for creating the new access token
- Generate a new refresh token (e.g., using `crypto.randomBytes(40).toString('hex')`) and store it hashed in the `refresh_tokens` table
- Delete the old refresh token row from the database before inserting the new one (token rotation)
- Lookup should compare hashed versions of the token to prevent timing attacks

## Notes
- Refresh token rotation (invalidating old token, issuing new one) prevents replay attacks if a refresh token is stolen
- The refresh endpoint must remain public -- clients call it precisely when their access token has expired
- Consider adding a cleanup mechanism for expired refresh tokens in a future story (out of scope here)
