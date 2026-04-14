# /tdd-archive — Archive Completed Tasks

Moves all `done` tasks from `_tasks/` into `_tasks/_archive/` to keep the active task list lean. Archived tasks are still tracked for dependency resolution — being in the archive directory signals `done` status without needing to read the file.

## Usage

```
/tdd-archive              # Archive all done tasks
```

## Instructions

### 1. Archive Tasks

Use the **Skill tool** to invoke `/tdd-task-archive` — this handles backend detection and performs the archive operation.

### 2. Commit (file backend only)

If the archive skill reports that tasks were moved (file backend):
- Stage all moved files (the deletes from `_tasks/` and additions in `_tasks/_archive/`) using `git add`
- Create a commit with message: `chore: archive N completed tasks` (where N is the count)
- Do **not** push

If the archive skill reports no action needed (beads backend), skip the commit.

### 3. Report

Relay the archive skill's output to the user. If no done tasks were found, report "No completed tasks to archive."

## Constraints

- Do not modify any file contents — only move files (file backend)
- Do not push to git

## Tools Available

Bash (git), Skill tool
