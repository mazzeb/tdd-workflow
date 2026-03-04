---
status: pending
priority: high
depends-on: [001]
---

# Add refresh_tokens database table and model

## Description

Create the database schema for storing refresh tokens and a corresponding `RefreshToken` model. Refresh tokens must be stored server-side so they can be revoked. This task adds the table to the schema and provides CRUD-like operations via a model class.

## Acceptance Criteria

- [ ] Given the database schema in `config/database.js`, when `initSchema` runs, then a `refresh_tokens` table is created with columns: `id`, `token`, `user_id`, `expires_at`, `created_at`
- [ ] Given a new model file `src/models/RefreshToken.js` exists, when `RefreshToken.create({ token, userId, expiresAt })` is called, then a row is inserted into `refresh_tokens` and the created record is returned
- [ ] Given a stored refresh token, when `RefreshToken.findByToken(token)` is called, then it returns the matching row or `undefined` if not found
- [ ] Given a stored refresh token, when `RefreshToken.deleteByToken(token)` is called, then the row is removed from the database
- [ ] Given a user with multiple refresh tokens, when `RefreshToken.deleteAllByUser(userId)` is called, then all refresh tokens for that user are removed (enables "logout everywhere")
- [ ] Given expired refresh tokens exist, when `RefreshToken.deleteExpired()` is called, then all rows where `expires_at` is in the past are removed

## Technical Notes

- Follow the existing model pattern: class with static methods, importing `getDb` from `../../config/database`.
- The `token` column should store the JWT refresh token string itself (or a hash of it for security -- implementer's choice, but the AC tests should pass either way).
- Update `initSchema` in `config/database.js` to include the new table creation.
- Also update the in-memory test DB setup in existing test files to include this table.
