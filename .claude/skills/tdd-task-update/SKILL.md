# /tdd-task-update — Update Task

Utility skill that updates task status, feedback, or acceptance criteria in the active backend. Used by orchestrators and agents — not typically invoked directly by users.

## Usage

```
/tdd-task-update <number/ID> --status <value>
/tdd-task-update <number/ID> --feedback "<content>"
/tdd-task-update <number/ID> --clear-feedback
/tdd-task-update <number/ID> --check-acs
```

## Instructions

### 1. Detect Backend

- Read `.claude/tdd-config.json` in the project root
- If missing or `"backend": "files"` → use File procedures
- If `"backend": "beads"` → use Beads procedures

### 2. Parse Arguments

Extract from `$ARGUMENTS`:
- **Task number/ID** (required)
- **Operation** (one of):
  - `--status <value>`: Update status (`pending`, `in-progress`, `in-review`, `done`)
  - `--feedback "<content>"`: Write/replace the Feedback section
  - `--clear-feedback`: Remove the Feedback section
  - `--check-acs`: Mark all AC checkboxes as checked

### 3. Update Status

#### File backend
1. Glob `_tasks/NNN-*.md` for the task number
2. Read the task file
3. Edit the frontmatter `status:` line to the new value
4. Valid values only: `pending`, `in-progress`, `in-review`, `done`
5. After writing, re-read the frontmatter to confirm the status was set correctly

#### Beads backend
Map status to Beads operations:
- `pending`: `bd update <id> --status open --json` + `bd label remove <id> in-review` (if present, ignore errors)
- `in-progress`: `bd update <id> --claim --json`
- `in-review`: `bd update <id> --claim --json` (ensures `in_progress`) + `bd update <id> --add-label in-review --json`
- `done`: `bd close <id> --reason "Verified: all ACs pass" --json` + `bd label remove <id> in-review` (ignore errors)

### 4. Update Feedback

#### File backend — Write
1. Read the task file
2. If a `## Feedback` section exists, replace it entirely (from `## Feedback` up to the next `## ` heading or end of file)
3. If no `## Feedback` section exists, insert it before `## Notes` (or at end of file if no Notes section)
4. Content format:
   ```markdown
   ## Feedback
   ### <Phase> — YYYY-MM-DD
   - <specific issue>
   ```

#### Beads backend — Write
1. `bd comment add <id> "<feedback content>"` — prefix with `## Feedback` marker

#### File backend — Clear
1. Read the task file
2. Delete the entire `## Feedback` section (from `## Feedback` up to the next `## ` heading or end of file)

#### Beads backend — Clear
1. `bd comment add <id> "Feedback resolved — task verified."`
   (Beads comments are append-only; the closing comment signals resolution)

### 5. Check ACs

#### File backend
1. Read the task file
2. Replace all `- [ ]` with `- [x]` in the Acceptance Criteria section
3. Write the updated file

#### Beads backend
1. `bd show <id> --json` — extract the `acceptance` field
2. Replace all `- [ ]` with `- [x]` in the text
3. Update: `bd update <id> --acceptance "$(cat <<'EOF'` ... updated text ... `EOF` `)"`

### 6. Report

- Confirm what was updated: "Task <number> status set to <value>" or "Feedback written for task <number>"
- Include the task file path (file backend) or issue ID (beads backend) in output

## Constraints

- Only update the specified field — do not modify other sections
- Validate status values — reject anything not in `pending`, `in-progress`, `in-review`, `done`
- Do not commit — the caller handles commits

## Tools Available

Read, Glob, Edit, Bash (for `bd` commands)
