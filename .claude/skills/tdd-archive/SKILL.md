# /tdd-archive — Archive Completed Tasks

Moves all `done` tasks from `_tasks/` into `_tasks/_archive/` to keep the active task list lean. Archived tasks are still tracked for dependency resolution — being in the archive directory signals `done` status without needing to read the file.

## Usage

```
/tdd-archive              # Archive all done tasks
```

## Instructions

### 1. Find Done Tasks

- Use Glob to find all `.md` files in `_tasks/` (not subdirectories — exclude `_tasks/_archive/`)
- Read each file and check the frontmatter for `status: done`
- Collect the list of done task files

### 2. Move to Archive

- Create `_tasks/_archive/` if it doesn't exist (use `mkdir -p`)
- Move each done task file from `_tasks/` to `_tasks/_archive/` using `mv`
- Preserve the original filename (e.g., `_tasks/003-auth-login.md` → `_tasks/_archive/003-auth-login.md`)

### 3. Report

Show what was archived:

```
Archived N tasks:
  003 — Auth login
  005 — Session management
  ...

Remaining active tasks: M
```

If no done tasks were found, report "No completed tasks to archive."

## Constraints

- Only move tasks with `status: done` — never move pending, in-progress, or in-review tasks
- Do not modify any file contents — only move files
- Do not delete any files
- Do not push to git — the user can commit the moves separately

## Tools Available

Read, Glob, Bash (mkdir, mv)
