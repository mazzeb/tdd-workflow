---
status: pending
priority: medium
depends-on: [004, 005]
---

# Add logout endpoint to revoke refresh tokens

## Description

Add a `POST /api/auth/logout` endpoint that revokes the user's refresh token, preventing it from being used to obtain new access tokens. This completes the auth lifecycle (login, refresh, logout).

## Acceptance Criteria

- [ ] Given a valid refresh token in the request body, when `POST /api/auth/logout` is called, then the refresh token is deleted from the database and the response is 200 with `{ data: { message: 'Logged out successfully' } }`
- [ ] Given a refresh token that does not exist in the database, when `POST /api/auth/logout` is called, then it still returns 200 (idempotent -- no error if already revoked)
- [ ] Given a missing refresh token in the request body, when `POST /api/auth/logout` is called, then it returns 400 with `{ error: { code: 'MISSING_TOKEN', message: ... } }`

## Technical Notes

- This endpoint goes in `src/routes/auth.js`.
- Logout should be a public endpoint (the refresh token in the body is the credential), or alternatively a protected endpoint that also accepts the refresh token. The simpler approach is public with the refresh token in the body.
- Use `RefreshToken.deleteByToken()` from the model (task 003).
- A future enhancement could add `POST /api/auth/logout-all` using `RefreshToken.deleteAllByUser()`, but that is out of scope for this task.
