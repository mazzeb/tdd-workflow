# /tdd-task-archive — Archive Completed Tasks

Utility skill that archives completed tasks in the active backend. Used by `/tdd-archive`.

## Usage

```
/tdd-task-archive
```

## Instructions

### 1. Detect Backend

- Read `.claude/tdd-config.json` in the project root
- If missing or `"backend": "files"` → use File procedures
- If `"backend": "beads"` → use Beads procedures

### 2. Archive

#### File backend
1. Use Glob to find all `.md` files in `_tasks/` (not subdirectories — exclude `_tasks/_archive/`)
2. Read each file and check frontmatter for `status: done`
3. If no done tasks, report "No completed tasks to archive." and stop
4. Create `_tasks/_archive/` if it doesn't exist (`mkdir -p _tasks/_archive`)
5. Move each done task: `mv _tasks/NNN-slug.md _tasks/_archive/NNN-slug.md`
6. Do not modify file contents — only move files

#### Beads backend
Closing an issue in Beads is the equivalent of archiving. When Verify marks a task as `done`, it calls `bd close`, which removes it from active lists.

Report: "Beads handles archiving automatically when tasks are closed. No manual archive step needed."

Optionally show closed issue count: `bd list --status closed --json`

### 3. Report

#### File backend
```
Archived N tasks:
  003 — Auth login
  005 — Session management

Remaining active tasks: M
```

#### Beads backend
```
Beads handles archiving automatically. N tasks are currently closed.
Active tasks: M
```

## Constraints

- File backend: only move tasks with `status: done` — never pending, in-progress, or in-review
- File backend: do not modify file contents, only move
- Do not commit — the caller handles commits
- Do not push to git

## Tools Available

Read, Glob, Bash (for `mkdir`, `mv`, `bd` commands)
