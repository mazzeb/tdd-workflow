# Task Operations Reference

This document defines how to perform task operations for both supported backends. Agents and skills must read this file and follow the procedures matching the active backend.

## Backend Detection

Read `.claude/tdd-config.json` in the project root. If it contains `"backend": "beads"`, use **Beads procedures**. If the file is missing or contains `"backend": "files"`, use **File procedures**.

---

## TASK-LIST: Find all active tasks

### File backend
1. Glob `_tasks/*.md` (exclude `_tasks/_archive/`)
2. Read each file and parse YAML frontmatter: `status`, `type`, `priority`, `depends-on`
3. Extract number and slug from filename (e.g., `003-auth-login.md` → number `003`, slug `auth-login`)
4. Extract title from the first `# ` heading in the file body
5. Return list of `{number, slug, title, type, status, priority, depends-on}`

### Beads backend
1. Run: `bd list --status open --json` and `bd list --status in_progress --json`
2. Parse the JSON output
3. Map fields:
   - `id` → number (use the beads ID, e.g., `bd-a1b2`)
   - `title` → title
   - Extract `slug` from labels: find the label starting with `slug:` and strip the prefix (e.g., label `slug:auth-login` → slug `auth-login`). If no slug label, derive from title (lowercase, hyphens, no special chars).
   - `type` → type (map `bug` → `bugfix`; for `task` type check labels: `refactor` label → `refactor`, `test-only` label → `test`, `chore` label → `chore`; default → `feature`)
   - `status`: `open` → `pending`, `in_progress` without `in-review` label → `in-progress`, `in_progress` with `in-review` label → `in-review`
   - `priority` → priority (map: `0`/`1` → `high`, `2` → `medium`, `3`/`4` → `low`)
   - Dependencies from `bd dep list <id> --json`
4. Sort by creation time (oldest first) to provide consistent ordering — this is the Beads equivalent of "lowest-numbered" in the file backend
5. Return the same shape as the file backend

---

## TASK-LIST-ARCHIVED: Get completed task identifiers

### File backend
1. Glob `_tasks/_archive/*.md`
2. Extract task numbers from filenames (no need to read file contents — presence in archive means `done`)

### Beads backend
1. Run: `bd list --status closed --json`
2. Extract issue IDs from JSON output

---

## TASK-FIND-NEXT: Find next eligible task

### File backend
1. Run TASK-LIST to get all active tasks
2. Run TASK-LIST-ARCHIVED for dependency resolution
3. Priority order:
   1. `in-review` → lowest-numbered match (resume at Verify)
   2. `in-progress` → lowest-numbered match (resume at Green)
   3. `pending` → exclude tasks whose `depends-on` references any task not `done` or archived → lowest-numbered eligible match
4. Return the selected task or "no eligible tasks"

### Beads backend
1. Run: `bd list --status in_progress --json` — filter for `in-review` label first → sort by creation time (oldest first) → pick first (resume at Verify)
2. If none: filter `in_progress` without `in-review` label → sort by creation time (oldest first) → pick first (resume at Green)
3. If none: run `bd ready --json` — this returns unblocked tasks with dependencies resolved natively → sort by creation time (oldest first) → pick first
4. **Ordering rationale**: Sorting by creation time (oldest first) mirrors the file backend's "lowest-numbered" behavior, since earlier-created tasks have lower numbers. Among tasks of equal age, prefer higher priority (lower priority number).

---

## TASK-READ: Read a single task by number/ID

### File backend
1. Glob `_tasks/NNN-*.md` where NNN is the zero-padded task number
2. Read the file completely
3. Parse frontmatter (`status`, `type`, `priority`, `depends-on`)
4. Parse body sections: `## Description`, `## Acceptance Criteria`, `## Technical Notes`, `## Notes`, `## Feedback`
5. Return all parsed data

### Beads backend
1. Run: `bd show <id> --json`
2. Map JSON fields:
   - `id` → number (the beads ID, e.g., `bd-a1b2`)
   - `title` → title
   - `description` → Description section
   - `acceptance` → Acceptance Criteria (stored as markdown with `- [ ]` / `- [x]` checkboxes)
   - `design` → Technical Notes
   - `notes` → Notes
   - `status` → map as in TASK-LIST
   - `type` → map as in TASK-LIST
   - `priority` → map as in TASK-LIST
3. **Feedback extraction** — run: `bd comment list <id> --json` and extract the **current** feedback:
   - Scan comments in reverse chronological order (newest first)
   - If the most recent feedback-related comment is `"Feedback resolved — task verified."`, there is **no current feedback** — return empty
   - Otherwise, find the most recent comment whose body starts with `## Feedback` — this is the **current** feedback. Ignore all older feedback comments (they are stale from prior rejection cycles)
   - Return the body of that comment as the Feedback section
4. Return the same shape as the file backend

---

## TASK-CREATE: Create a new task

### File backend
1. Run TASK-LIST and TASK-LIST-ARCHIVED to find the highest existing task number
2. New number = highest + 1, zero-padded to 3 digits
3. Write file to `_tasks/NNN-slug.md` using the template:
   ```markdown
   ---
   status: pending
   type: <type>
   priority: <priority>
   depends-on: [<deps>]
   ---
   # <Title>

   ## Description
   <description>

   ## Acceptance Criteria
   <ACs as - [ ] lines>

   ## Technical Notes
   <notes>

   ## Notes
   <additional notes>
   ```
4. Create `_tasks/` directory if it doesn't exist

### Beads backend
1. Run: `bd create "<title>" -t <beads-type> -p <beads-priority> --json`
   - Type mapping: `feature` → `feature`, `bugfix` → `bug`, `refactor` → `task`, `test` → `task`, `chore` → `task`
   - Priority mapping: `high` → `1`, `medium` → `2`, `low` → `3`
   - For `refactor` type, add label: `bd label add <id> refactor`
   - For `test` type, add label: `bd label add <id> test-only`
   - For `chore` type, add label: `bd label add <id> chore`
2. **Preserve the slug** for human readability: `bd label add <id> slug:<slug>`
   - Example: `bd label add bd-a1b2 slug:auth-login`
   - This allows humans and tools to identify tasks by meaningful names alongside opaque Beads IDs
3. Update fields (use heredocs for multiline content with special characters):
   - Description: `bd update <id> --body-file - <<'EOF'` ... `EOF`
   - Design notes: `bd update <id> --design-file - <<'EOF'` ... `EOF`
   - ACs (no stdin flag — pass as string): `bd update <id> --acceptance "$(cat <<'EOF'` ... `EOF` `)"`
   - Notes (no stdin flag — pass as string): `bd update <id> --notes "$(cat <<'EOF'` ... `EOF` `)"`
4. Set dependencies: `bd dep add <new-id> <dep-id>` for each dependency
   - Note: `bd dep add A B` means "A depends on B"
5. Return the created issue ID and slug label

---

## TASK-UPDATE-STATUS: Change task status

### File backend
1. Read the task file
2. Edit the frontmatter `status:` line to the new value
3. Valid values: `pending`, `in-progress`, `in-review`, `done`
4. After writing, re-read to confirm

### Beads backend
Status mapping:
- To `pending`: `bd update <id> --status open` + `bd label remove <id> in-review` (if present)
- To `in-progress`: `bd update <id> --claim` (sets `in_progress` + assigns)
- To `in-review`: `bd update <id> --claim` (ensures `in_progress`) + `bd update <id> --add-label in-review`
- To `done`: `bd close <id> --reason "Verified: all ACs pass"` + `bd label remove <id> in-review` (if present)

---

## TASK-UPDATE-FEEDBACK: Write or remove feedback

### File backend
- **Write**: Replace the entire `## Feedback` section in the task file (or add it before `## Notes` if absent). Use Edit tool.
- **Remove**: Delete the `## Feedback` section entirely from the task file. Use Edit tool.

### Beads backend
- **Write**: `bd comment add <id> "<feedback content>"` — the body **must** start with `## Feedback` so TASK-READ can identify it. Each write supersedes all prior feedback comments (agents reading feedback via TASK-READ only see the most recent `## Feedback` comment, per the extraction logic above).
- **Remove**: `bd comment add <id> "Feedback resolved — task verified."` — This signals that all prior feedback is resolved. TASK-READ will return empty feedback when this is the most recent feedback-related comment.

---

## TASK-UPDATE-ACS: Check off acceptance criteria

### File backend
1. Read the task file
2. Change `- [ ]` to `- [x]` for each AC that passes
3. Write the updated file

### Beads backend
1. Read current acceptance text: `bd show <id> --json` → parse `acceptance` field
2. Replace `- [ ]` with `- [x]` in the text
3. Update: `bd update <id> --acceptance "$(cat <<'EOF'` ... updated text ... `EOF` `)"`

---

## TASK-ARCHIVE: Archive completed tasks

### File backend
1. Run TASK-LIST, filter for `status: done`
2. Create `_tasks/_archive/` if it doesn't exist (`mkdir -p`)
3. Move each done file: `mv _tasks/NNN-slug.md _tasks/_archive/NNN-slug.md`
4. Return count of archived tasks

### Beads backend
Closing an issue in Beads is equivalent to archiving — `bd close` already moves it out of active lists. This operation is a **no-op** for Beads.
- Report: "Beads handles archiving automatically when tasks are closed. No action needed."
- Optionally run `bd list --status closed --json` to show the count of closed issues.

---

## TASK-CHANGED-FILES: Report which files were changed

This operation is the same for both backends. After any agent phase, output a `## Changed Files` section listing every file created, modified, or deleted.

### File backend
Include the task file path (e.g., `_tasks/NNN-slug.md`) in the changed files list.

### Beads backend
The Beads database (`.beads/` directory) is updated automatically by `bd` commands. Do **not** include `.beads/` files in the Changed Files list that agents output — only list test and source files that were directly created/modified/deleted.

However, at **commit time** orchestrators must also run `git add .beads/` to include Beads database changes alongside the code changes. This is handled by the orchestrator, not the agent.
