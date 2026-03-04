# JWT Auth Refactor -- Task Plan Summary

## Feature Request

Refactor auth from base64 token to proper JWT with token expiration and refresh tokens -- remove the current base64 approach.

## Codebase Analysis

The bookmark manager API uses Express + SQLite (better-sqlite3) with Jest for testing. The current auth system is minimal:

- **`src/middleware/auth.js`**: Decodes a base64-encoded user ID from the `Authorization: Bearer <token>` header. No signature verification, no expiration, no security.
- **`tests/bookmarks.test.js`**: Generates tokens via `Buffer.from('1').toString('base64')`.
- **No users table**: The project doesn't have user accounts with passwords -- it just trusts the user ID in the token.
- **No existing JWT infrastructure**: `jsonwebtoken` is not in dependencies.

## Task Breakdown

### 001 -- Add JWT dependency and config (`priority: high`, no dependencies)
Foundation task. Adds `jsonwebtoken` to package.json and creates `config/jwt.js` with secrets and expiry settings (environment-variable-driven with defaults).

### 002 -- Create JWT token service (`priority: high`, depends on 001)
Builds `src/services/token.js` with functions: `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`. Isolates all `jsonwebtoken` usage to one module.

### 003 -- Add refresh_tokens table and model (`priority: high`, depends on 001)
Extends the database schema with a `refresh_tokens` table and creates `src/models/RefreshToken.js` with CRUD operations: `create`, `findByToken`, `deleteByToken`, `deleteAllByUser`, `deleteExpired`.

### 004 -- Create auth routes for login (`priority: high`, depends on 002, 003)
Adds `src/routes/auth.js` with `POST /api/auth/login`. Issues both an access token and a refresh token, stores the refresh token in the database. Mounted as a public route.

### 005 -- Create token refresh endpoint (`priority: high`, depends on 004)
Adds `POST /api/auth/refresh` that validates a refresh token, rotates it (deletes old, stores new), and returns fresh access + refresh tokens. Handles expired and revoked token cases.

### 006 -- Replace base64 middleware with JWT verification (`priority: high`, depends on 002)
The core swap. Rewrites `src/middleware/auth.js` to use `verifyAccessToken` instead of base64 decoding. Distinguishes between expired tokens (`TOKEN_EXPIRED`) and invalid tokens (`UNAUTHORIZED`). Preserves the `req.user = { id }` contract. Includes a `[REMOVE]` AC for the base64 logic.

### 007 -- Add logout endpoint (`priority: medium`, depends on 004, 005)
Adds `POST /api/auth/logout` that revokes a refresh token by deleting it from the database. Idempotent -- succeeds even if the token is already gone.

### 008 -- Update existing tests to use JWT tokens (`priority: high`, depends on 006)
Migrates `tests/bookmarks.test.js` from base64 token generation to JWT token generation via the token service. All existing assertions must continue to pass. Includes a `[REMOVE]` AC for the base64 test code.

### 009 -- Add token expiration integration tests (`priority: medium`, depends on 006, 008)
New `tests/auth.test.js` covering the full token lifecycle: expired access tokens get 401, refresh flow works end-to-end, rotated tokens cannot be reused, and revoked tokens are rejected.

## Dependency Graph

```
001 (JWT config)
 |--- 002 (token service) --- 004 (login route) --- 005 (refresh endpoint) --- 007 (logout)
 |                         \                    /
 |                          \--- 006 (middleware swap) --- 008 (test migration) --- 009 (integration tests)
 |--- 003 (refresh_tokens table) --- 004
```

## Execution Order

A valid execution order respecting dependencies:

1. **001** -- JWT config (no deps)
2. **002** -- Token service (needs 001)
3. **003** -- Refresh tokens table (needs 001) -- can run in parallel with 002
4. **006** -- Middleware swap (needs 002)
5. **004** -- Login route (needs 002, 003)
6. **005** -- Refresh endpoint (needs 004)
7. **007** -- Logout endpoint (needs 004, 005)
8. **008** -- Test migration (needs 006)
9. **009** -- Integration tests (needs 006, 008)

## Notes

- Tasks 002 and 003 can proceed in parallel since they depend only on 001.
- Task 006 (middleware swap) is the breaking change -- after it, old base64 tokens stop working. Task 008 must follow immediately to fix existing tests.
- Two tasks use `[REMOVE]` acceptance criteria: 006 (remove base64 decoding from middleware) and 008 (remove base64 token generation from tests).
- The project lacks a real users table, so the login endpoint uses a simple `userId` in the request body. This is noted in task 004 for future enhancement.
