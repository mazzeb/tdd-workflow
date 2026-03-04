---
status: pending
priority: medium
depends-on: [2, 3]
---
# Logout Endpoint -- Revoke Refresh Tokens

## Description
Add a `POST /auth/logout` endpoint that revokes a user's refresh token, preventing it from being used to obtain new access tokens. This completes the authentication lifecycle: login, refresh, and logout. Without this, a stolen refresh token could be used indefinitely until it expires.

## Acceptance Criteria
- [ ] Given an authenticated user with a valid access token and a request body `{ "refreshToken": "<token>" }`, when POST /auth/logout is called, then the response is 204 with no body
- [ ] Given POST /auth/logout has been called with a refresh token, when POST /auth/refresh is subsequently called with that same refresh token, then the response is 401 with `{ error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } }`
- [ ] Given a POST /auth/logout request with no refreshToken in the body, when the endpoint processes the request, then the response is 400 with `{ error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' } }`
- [ ] Given a POST /auth/logout request with an invalid or already-revoked refresh token, when the endpoint processes the request, then the response is 204 (idempotent -- no error for already-revoked tokens)

## Technical Notes
- Add the endpoint to `src/routes/auth.js`
- This endpoint requires the `authenticate` middleware (must be logged in to log out)
- Mount as a protected route in `src/app.js` or add `authenticate` inline in the route definition
- Implementation: delete the matching refresh token row from the `refresh_tokens` table
- The 204 response for already-revoked tokens follows the idempotency principle -- calling logout twice should not fail

## Notes
- Access tokens cannot be revoked (they are stateless JWTs) -- they will simply expire after their TTL
- For higher security needs, a token blacklist could be added in a future story (out of scope here)
- The endpoint is idempotent by design to simplify client-side error handling
