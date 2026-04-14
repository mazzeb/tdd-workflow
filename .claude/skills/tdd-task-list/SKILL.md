# /tdd-task-list — List & Find Tasks

Utility skill that abstracts task listing across backends. Used by other skills — not typically invoked directly by users.

## Usage

```
/tdd-task-list                    # List all active tasks
/tdd-task-list next               # Find next eligible task
/tdd-task-list --status pending   # Filter by status
```

## Instructions

### 1. Detect Backend

- Read `.claude/tdd-config.json` in the project root
- If missing or `"backend": "files"` → use File procedures
- If `"backend": "beads"` → use Beads procedures

### 2. List Tasks

#### File backend
1. Use Glob to find all `.md` files directly in `_tasks/` (not subdirectories — exclude `_tasks/_archive/`)
2. If `_tasks/` doesn't exist or has no `.md` files, return empty list
3. Read each file and parse:
   - **Number** and **slug** from filename (e.g., `003-auth-login.md` → `003`, `auth-login`)
   - **Title** from the first `# ` heading
   - **Type** from frontmatter (default `feature` if missing)
   - **Status** from frontmatter (`pending`, `in-progress`, `in-review`, `done`)
   - **Priority** from frontmatter
   - **Dependencies** from frontmatter `depends-on` list
4. Also Glob `_tasks/_archive/*.md` and extract task numbers from filenames for the archived list

#### Beads backend
1. Run: `bd list --status open --json` and `bd list --status in_progress --json`
2. Parse JSON and map fields:
   - `id` → number (beads ID, e.g., `bd-a1b2`)
   - `title` → title
   - Extract `slug` from labels: find the label starting with `slug:` and strip the prefix (e.g., label `slug:auth-login` → slug `auth-login`). If no slug label, derive from title (lowercase, hyphens, no special chars).
   - `type`: map `bug` → `bugfix`; for `task` type, check labels (`refactor` → `refactor`, `test-only` → `test`, `chore` → `chore`); default → `feature`
   - `status`: `open` → `pending`, `in_progress` without `in-review` label → `in-progress`, `in_progress` with `in-review` label → `in-review`
   - `priority`: `0`/`1` → `high`, `2` → `medium`, `3`/`4` → `low`
   - Dependencies: `bd dep list <id> --json` for each issue
3. Sort by creation time (oldest first) for consistent ordering — mirrors the file backend's "lowest-numbered" behavior
4. For archived count: `bd list --status closed --json`

### 3. Handle Arguments

If `$ARGUMENTS` contains:
- **`next`**: Find the next eligible task (see below)
- **`--status <value>`**: Filter the list to only tasks with that status
- No arguments: return the full list

### 4. Find Next Eligible (when `next` is requested)

#### File backend
Check in this priority order:
1. `in-review` → lowest-numbered match (resume at Verify)
2. `in-progress` → lowest-numbered match (resume at Green)
3. `pending` → exclude tasks whose `depends-on` references any task not `status: done` **or archived** (tasks in `_tasks/_archive/` are implicitly done — check archived task numbers from filenames via Glob) → lowest-numbered eligible match

#### Beads backend
1. `bd list --status in_progress --json` → filter for `in-review` label → sort by creation time (oldest first) → pick first (resume at Verify)
2. If none: filter `in_progress` without `in-review` label → sort by creation time (oldest first) → pick first (resume at Green)
3. If none: `bd ready --json` → sort by creation time (oldest first), break ties by priority (lower number = higher priority) → pick first (Beads resolves dependencies natively)

### 5. Output

Present results as a structured summary:
- For list: markdown table with columns `#`, `Task`, `Type`, `Status`, `Priority`, `Deps`
- For next: the selected task's number, title, type, status, and why it was selected
- Include summary counts: pending/in-progress/in-review/done/archived
- If no tasks found: report "No tasks found"
- If no eligible next task: report "No eligible tasks found"

## Constraints

- **Read-only** — do not modify any files or run any write commands
- Keep output concise and machine-parseable for consuming skills

## Tools Available

Read, Glob, Grep, Bash (for `bd` commands — read-only)
