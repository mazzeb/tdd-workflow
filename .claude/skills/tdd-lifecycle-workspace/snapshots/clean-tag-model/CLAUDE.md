# Bookmark Manager API

A REST API for managing bookmarks with tags and folders.

## Tech Stack
- Node.js + Express
- SQLite via better-sqlite3
- Jest for testing

## Commands
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm start             # Start server on port 3000
```

## Project Structure
```
src/
  app.js              # Express app setup and middleware
  routes/             # Route handlers
  middleware/          # Auth, validation, error handling
  models/             # Database models (better-sqlite3)
config/
  database.js         # DB connection and schema
tests/                # Jest test files (*.test.js)
```

## Conventions
- Routes return JSON with `{ data: ... }` wrapper on success
- Errors return `{ error: { code, message } }`
- Auth via Bearer token in Authorization header
- Model files export a class with static methods
- Tests use a fresh in-memory DB per test file
