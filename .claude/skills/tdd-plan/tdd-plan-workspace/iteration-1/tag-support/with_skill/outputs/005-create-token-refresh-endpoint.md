---
status: pending
priority: high
depends-on: [004]
---

# Create token refresh endpoint

## Description

Add a `POST /api/auth/refresh` endpoint that accepts a valid refresh token and returns a new access token (and optionally rotates the refresh token). This enables clients to get new access tokens without re-authenticating when the short-lived access token expires.

## Acceptance Criteria

- [ ] Given a valid, non-expired refresh token that exists in the database, when `POST /api/auth/refresh` is called with `{ refreshToken }`, then it returns status 200 with `{ data: { accessToken, refreshToken } }` containing fresh tokens
- [ ] Given a valid refresh token is used for refresh, when the new tokens are issued, then the old refresh token is deleted from the database and the new one is stored (token rotation)
- [ ] Given an expired refresh token, when `POST /api/auth/refresh` is called, then it returns 401 with `{ error: { code: 'TOKEN_EXPIRED', message: ... } }`
- [ ] Given a refresh token that is not in the database (revoked or never issued), when `POST /api/auth/refresh` is called, then it returns 401 with `{ error: { code: 'INVALID_TOKEN', message: ... } }`
- [ ] Given a missing or malformed refresh token in the request body, when `POST /api/auth/refresh` is called, then it returns 400 with `{ error: { code: 'MISSING_TOKEN', message: ... } }`
- [ ] Given the refresh endpoint, when it is called, then it is accessible without authentication (public route)

## Technical Notes

- This endpoint goes in `src/routes/auth.js` alongside the login route.
- Token rotation (issuing a new refresh token on each refresh) prevents replay attacks. The old refresh token must be deleted and a new one stored.
- Use the token service (task 002) for verification and generation, and the RefreshToken model (task 003) for database operations.
- This is a public endpoint -- the refresh token in the body is the credential.
