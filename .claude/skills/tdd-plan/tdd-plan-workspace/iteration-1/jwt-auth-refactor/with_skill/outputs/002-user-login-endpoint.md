---
status: pending
priority: high
depends-on: [1]
---
# User Login Endpoint

## Description
Add a `POST /auth/login` endpoint that accepts email and password credentials, validates them against stored user records, and returns a JWT access token plus a refresh token. This requires adding a `users` table to the database schema and a User model. The login endpoint is the entry point for obtaining JWT tokens, replacing the previous approach where clients simply base64-encoded a user ID.

## Acceptance Criteria
- [ ] Given a user with email "user@example.com" and a valid hashed password in the database, when POST /auth/login is called with `{ "email": "user@example.com", "password": "correct-password" }`, then the response is 200 with `{ data: { accessToken: "<jwt>", refreshToken: "<token>" } }`
- [ ] Given a POST /auth/login request with `{ "email": "user@example.com", "password": "correct-password" }`, when the response is returned, then `accessToken` is a valid JWT containing `{ sub: <userId> }` with an expiration claim
- [ ] Given a POST /auth/login request with `{ "email": "user@example.com", "password": "correct-password" }`, when the response is returned, then `refreshToken` is a non-empty string stored in the database associated with the user
- [ ] Given a POST /auth/login request with a non-existent email, when the endpoint processes the request, then the response is 401 with `{ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }`
- [ ] Given a POST /auth/login request with a valid email but wrong password, when the endpoint processes the request, then the response is 401 with `{ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }` (same error as non-existent email to avoid user enumeration)
- [ ] Given a POST /auth/login request missing the email field, when the endpoint processes the request, then the response is 400 with `{ error: { code: 'MISSING_EMAIL', message: 'Email is required' } }`
- [ ] Given a POST /auth/login request missing the password field, when the endpoint processes the request, then the response is 400 with `{ error: { code: 'MISSING_PASSWORD', message: 'Password is required' } }`

## Technical Notes
- Add a `users` table to `config/database.js` schema: `id`, `email` (unique), `password_hash`, `created_at`
- Add a `refresh_tokens` table: `id`, `token`, `user_id`, `expires_at`, `created_at`
- Create `src/models/User.js` following the existing static-method pattern in `Bookmark.js` and `Folder.js`
- Create `src/routes/auth.js` for auth endpoints
- Mount auth routes in `src/app.js` as a public route (no `authenticate` middleware): `app.use('/auth', authRoutes)`
- Use `bcrypt` or `crypto.scryptSync` (Node built-in) for password hashing -- prefer `crypto.scryptSync` to avoid adding another dependency
- Refresh tokens should have a longer expiration (e.g., 7 days) and be stored hashed in the database
- Follow existing patterns: `{ data: ... }` for success, `{ error: { code, message } }` for errors

## Notes
- The same error message for wrong email and wrong password is intentional to prevent user enumeration attacks
- Tests will need to seed the users table with test users -- follow the existing jest.mock pattern in `tests/bookmarks.test.js` for database setup
- A user registration endpoint is out of scope -- test users can be inserted directly in test setup
