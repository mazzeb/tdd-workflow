# JWT Auth Refactor -- Planning Summary

## Created Tasks

| # | Title | Priority | Depends On |
|---|-------|----------|------------|
| 001 | Replace Base64 Auth with JWT Token Verification | high | -- |
| 002 | User Login Endpoint | high | 001 |
| 003 | Refresh Token Endpoint | high | 001, 002 |
| 004 | Logout Endpoint -- Revoke Refresh Tokens | medium | 002, 003 |

## Dependency Graph

```
001 Replace Base64 Auth with JWT Token Verification
 |
 +---> 002 User Login Endpoint
 |      |
 |      +---> 003 Refresh Token Endpoint
 |             |
 |             +---> 004 Logout Endpoint -- Revoke Refresh Tokens
 |                    ^
 +--------------------+
```

## Recommended Implementation Order

1. **001 -- Replace Base64 Auth with JWT Token Verification** -- This is the foundational story. It replaces the insecure base64 token decoding in `src/middleware/auth.js` with proper JWT verification, adds the `jsonwebtoken` dependency, and updates existing tests. All other stories depend on this.

2. **002 -- User Login Endpoint** -- Adds the `POST /auth/login` endpoint, the `users` table, the `refresh_tokens` table, and the `User` model. This is required before refresh or logout can function since it is the entry point for obtaining tokens.

3. **003 -- Refresh Token Endpoint** -- Adds `POST /auth/refresh` with token rotation. Depends on both the JWT infrastructure from 001 and the refresh token storage from 002.

4. **004 -- Logout Endpoint -- Revoke Refresh Tokens** -- Adds `POST /auth/logout` to revoke refresh tokens. This completes the authentication lifecycle and depends on both login and refresh stories being in place.

## Key Design Decisions

- **Combined removal and replacement in story 001**: The base64 `[REMOVE]` ACs are in the same story as the JWT replacement because you cannot remove the old auth without having the new auth in place -- the middleware must always work.
- **`crypto.scryptSync` over bcrypt**: To avoid adding another npm dependency, password hashing uses Node's built-in `crypto` module.
- **Refresh token rotation**: Each refresh request invalidates the old token and issues a new one, preventing replay attacks with stolen tokens.
- **Consistent error responses**: All new endpoints follow the existing `{ error: { code, message } }` pattern documented in `CLAUDE.md`.
- **No user registration endpoint**: Out of scope for this refactoring. Test users are seeded directly in test setup.

## Open Questions

- **JWT secret management**: The plan uses `process.env.JWT_SECRET` with a dev fallback. For production, a proper secrets management solution should be configured separately.
- **Access token TTL**: Defaulting to 15 minutes. This can be adjusted based on the application's security requirements.
- **Refresh token TTL**: Defaulting to 7 days. Longer or shorter durations may be appropriate depending on usage patterns.
- **Expired token cleanup**: No automatic cleanup of expired refresh tokens is included. A scheduled job or cleanup-on-read strategy could be added in a future story.
