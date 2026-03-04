---
status: pending
priority: high
depends-on: []
---

# Add JWT dependency and configuration module

## Description

Introduce the `jsonwebtoken` npm package and create a centralized JWT configuration module that defines token secrets and expiration settings. This provides the foundation all subsequent JWT tasks build upon.

## Acceptance Criteria

- [ ] Given the project dependencies, when `package.json` is inspected, then `jsonwebtoken` is listed under `dependencies`
- [ ] Given a new config file `config/jwt.js` exists, when it is imported, then it exports `accessTokenSecret`, `refreshTokenSecret`, `accessTokenExpiry`, and `refreshTokenExpiry`
- [ ] Given no environment variables are set, when the JWT config is loaded, then sensible defaults are used (e.g., access token expires in `'15m'`, refresh token expires in `'7d'`)
- [ ] Given environment variables `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY` are set, when the JWT config is loaded, then those values override the defaults

## Technical Notes

- The config module should be a simple object export, consistent with the existing `config/database.js` pattern.
- Default secrets should only be used for development/testing; the module should log a warning or comment indicating production must set env vars.
- No route changes yet -- this is purely additive infrastructure.
