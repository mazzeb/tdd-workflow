---
status: pending
priority: high
depends-on: [002, 003]
---

# Create auth routes for login and JWT token issuance

## Description

Add a new `src/routes/auth.js` router with a `POST /api/auth/login` endpoint. This endpoint accepts user credentials (for this project, a simple user ID since there is no users table with passwords), generates a JWT access token and a refresh token, stores the refresh token in the database, and returns both tokens to the client.

## Acceptance Criteria

- [ ] Given valid login credentials, when `POST /api/auth/login` is called with `{ userId: 1 }`, then the response has status 200 and body `{ data: { accessToken, refreshToken } }` where both are JWT strings
- [ ] Given valid login credentials, when a login succeeds, then the refresh token is stored in the `refresh_tokens` table
- [ ] Given the returned access token, when it is decoded, then it contains `{ id: <userId> }` and has an expiration claim
- [ ] Given missing or invalid credentials in the request body, when `POST /api/auth/login` is called, then it returns 400 with `{ error: { code: 'INVALID_CREDENTIALS', message: ... } }`
- [ ] Given the auth router is mounted, when `POST /api/auth/login` is called, then it is accessible without authentication (public route)

## Technical Notes

- Mount the auth router in `src/app.js` at `/api/auth` before the `authenticate` middleware, so it's a public route.
- Since the project has no users table with passwords, the login endpoint can accept a `userId` directly for now. A note should be left for future password-based authentication.
- The route should use the token service (task 002) for generation and the RefreshToken model (task 003) for storage.
- Follow the project's `{ data: ... }` / `{ error: ... }` response conventions.
