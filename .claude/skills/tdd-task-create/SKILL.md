# /tdd-task-create — Create Task

Utility skill that creates a task in the active backend. Used by `/tdd-plan` and `/tdd-quick` — not typically invoked directly by users.

## Usage

```
/tdd-task-create
```

The caller (skill or user) must provide the task details as `$ARGUMENTS` or through conversation context:
- **title** (required)
- **slug** (required for files backend, derived from title)
- **type**: `feature` | `bugfix` | `refactor` | `test` | `chore` (default: `feature`)
- **priority**: `high` | `medium` | `low` (default: `medium`)
- **depends-on**: list of task numbers/IDs
- **description**: what and why
- **acceptance-criteria**: list of ACs in `- [ ] Given/When/Then` or `- [ ] [REMOVE]` format
- **technical-notes**: implementation hints
- **notes**: edge cases, constraints

## Instructions

### 1. Detect Backend

- Read `.claude/tdd-config.json` in the project root
- If missing or `"backend": "files"` → use File procedures
- If `"backend": "beads"` → use Beads procedures

### 2. Determine Next Number (File backend only)

1. Glob `_tasks/*.md` and `_tasks/_archive/*.md`
2. Extract task numbers from all filenames
3. New number = highest + 1, zero-padded to 3 digits (e.g., `004`)
4. If no tasks exist, start at `001`
5. Create `_tasks/` directory if it doesn't exist

### 3. Create Task

#### File backend
Write the task file to `_tasks/NNN-slug.md`:

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
<ACs>

## Technical Notes
<technical-notes>

## Notes
<notes>
```

Use the template from `.claude/skills/tdd-plan/template.md` as reference for structure.

#### Beads backend
1. Create the issue:
   ```
   bd create "<title>" -t <beads-type> -p <beads-priority> --json
   ```
   Type mapping: `feature` → `feature`, `bugfix` → `bug`, `refactor` → `task`, `test` → `task`, `chore` → `task`
   Priority mapping: `high` → `1`, `medium` → `2`, `low` → `3`

2. Add type labels for non-direct mappings:
   - `refactor`: `bd label add <id> refactor`
   - `test`: `bd label add <id> test-only`
   - `chore`: `bd label add <id> chore`

3. Preserve the slug for human readability:
   ```
   bd label add <id> slug:<slug>
   ```
   Example: `bd label add bd-a1b2 slug:auth-login`

4. Set fields (use heredocs for multiline content with special characters):
   ```bash
   # Description (supports stdin via --body-file -)
   bd update <id> --body-file - <<'EOF'
   <description>
   EOF

   # Design/technical notes (supports stdin via --design-file -)
   bd update <id> --design-file - <<'EOF'
   <technical-notes>
   EOF

   # Acceptance criteria (no stdin flag — pass as string argument)
   bd update <id> --acceptance "$(cat <<'EOF'
   <ACs>
   EOF
   )"

   # Notes (no stdin flag — pass as string argument)
   bd update <id> --notes "$(cat <<'EOF'
   <notes>
   EOF
   )"
   ```

5. Set dependencies:
   ```
   bd dep add <new-id> <dep-id>
   ```
   Note: `bd dep add A B` means "A depends on B"

### 4. Report

Output:
- The created task number/ID and filename/path
- Confirmation of type, priority, and dependency settings
- The task is ready for the TDD cycle

## Constraints

- Only create the task — do not start any TDD phases
- Do not commit — the caller handles commits
- Validate that all required fields (title, at least one AC) are present before creating

## Tools Available

Read, Glob, Write, Edit, Bash (for `bd` commands and `mkdir -p`)
