---
status: pending
priority: high
depends-on: [006]
---

# Update existing tests to use JWT tokens instead of base64

## Description

Update `tests/bookmarks.test.js` (and any other existing test files) to generate valid JWT access tokens for authenticated requests instead of using the old base64-encoded user ID. This ensures the existing test suite passes with the new JWT-based auth middleware.

## Acceptance Criteria

- [ ] [REMOVE] Given `tests/bookmarks.test.js`, when its source code is inspected, then there is no `Buffer.from(...).toString('base64')` call or base64 token generation
- [ ] Given the existing bookmark tests, when they create an auth token, then they use the token service's `generateAccessToken({ id: 1 })` to produce a valid JWT
- [ ] Given the existing bookmark tests, when they run with `npm test`, then all previously passing tests still pass with the new JWT tokens
- [ ] Given the existing 401-unauthorized tests, when they run, then they still correctly verify that requests without tokens are rejected

## Technical Notes

- The main change is replacing `const userToken = Buffer.from('1').toString('base64')` with a JWT token generated via the token service.
- The test DB mock setup may need to include the `refresh_tokens` table (from task 003) even if these bookmark tests don't directly test refresh logic.
- Keep the test structure and assertions as close to the original as possible -- this is a token-format migration, not a test rewrite.
- If the token service requires `jsonwebtoken` at import time, ensure it's available in the test environment (it should be since task 001 adds it as a dependency).
