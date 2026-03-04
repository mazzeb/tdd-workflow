---
status: pending
priority: high
depends-on:
  - 001-add-tags-to-bookmarks
  - 003-search-bookmarks-by-url
---

# Search Bookmarks by Tags

## Description

Extend the search endpoint to also match against bookmark tags. A search query should now match against title, URL, or any associated tag name, returning bookmarks where any of the three fields match.

## Acceptance Criteria

- [ ] Given a user sends GET /api/bookmarks/search?q=javascript, when a bookmark has tag "javascript" but title "My Tutorial" and URL "https://tutorial.com", then the bookmark is returned (tag match)
- [ ] Given a user sends GET /api/bookmarks/search?q=react, when one bookmark has tag "react" and another has title "React Guide", then both bookmarks are returned
- [ ] Given a user sends GET /api/bookmarks/search?q=dev, when a bookmark has tags ["dev", "tools"] and another has no tags, then only the tagged bookmark is returned (assuming no other field matches)
- [ ] Given a user sends GET /api/bookmarks/search?q=node, when a bookmark has tag "node" and title "Node Guide" and URL "https://nodejs.org", then it is returned only once (no duplicates from multiple matches)
- [ ] Given a user sends GET /api/bookmarks/search?q=javascript, when the search results are returned, then each bookmark includes its `tags` array in the response

## Technical Notes

- Modify the `search` method to LEFT JOIN `bookmark_tags` and `tags` tables
- Use `WHERE (title LIKE ? OR url LIKE ? OR tags.name LIKE ?)` with GROUP BY to eliminate duplicates
- Use `GROUP_CONCAT` or a secondary query to attach tags to each result
- Be mindful of the LEFT JOIN — bookmarks without tags must still be searchable by title and URL
