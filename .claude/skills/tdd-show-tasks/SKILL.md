# /tdd-show-tasks — Show Task Summary

Displays a quick overview of all tasks and their current status.

## Usage

```
/tdd-show-tasks
```

## Instructions

When the user invokes `/tdd-show-tasks`, follow this process:

### 1. Get All Tasks

Use the **Skill tool** to invoke `/tdd-task-list` — this handles backend detection and returns all active tasks with their metadata, archived count, and next eligible task.

### 2. Display Summary Table

Present the tasks as a markdown table sorted by task number/ID:

```
| #   | Task                | Type     | Status      | Priority | Deps |
|-----|---------------------|----------|-------------|----------|------|
| 001 | Story title         | feature  | pending     | high     | —    |
| 002 | Restructure auth    | refactor | in-progress | medium   | 001  |
| 003 | Third story         | chore    | done        | medium   | 1, 2 |
```

Use these status indicators:
- `pending` — waiting to be started
- `in-progress` — tests written, implementation underway
- `in-review` — implementation complete, verification pending
- `done` — verified and complete

### 3. Show Summary Counts

Below the table, show:
- Total active tasks (exclude archived)
- Count per status (e.g., "2 pending, 1 in-progress, 3 done")
- Archived task count if any (e.g., "42 archived")
- Next eligible task from the task-list output. Show "All tasks complete!" if none remain
- If there are active `done` tasks, suggest: "Run /tdd-archive to archive completed tasks"

## Constraints

- This is a **read-only** skill — do NOT modify any files
- Do NOT launch any subagents
- Keep the output concise and scannable
