# /tdd-show-tasks — Show Task Summary

Displays a quick overview of all tasks and their current status.

## Usage

```
/tdd-show-tasks
```

## Instructions

When the user invokes `/tdd-show-tasks`, follow this process:

### 1. Read All Tasks

- Use Glob to find all `.md` files in the `_tasks/` directory
- If `_tasks/` doesn't exist or is empty, report "No tasks found. Run /tdd-plan to create some." and stop

### 2. Parse Each Task

For each task file, extract:
- **Number** and **slug** from the filename (e.g., `003-auth-login.md` → `003`, `auth-login`)
- **Title** from the first `# ` heading
- **Status** from frontmatter (`pending`, `in-progress`, or `done`)
- **Priority** from frontmatter
- **Dependencies** from frontmatter `depends-on` list
### 3. Display Summary Table

Present the tasks as a markdown table sorted by task number:

```
| #   | Task                | Status      | Priority | Deps |
|-----|---------------------|-------------|----------|------|
| 001 | Story title         | pending     | high     | —    |
| 002 | Another story       | in-progress | medium   | 001  |
| 003 | Third story         | done        | medium   | 1, 2 |
```

Use these status indicators:
- `pending` — waiting to be started
- `in-progress` — tests written, implementation underway
- `done` — verified and complete

### 4. Show Summary Counts

Below the table, show:
- Total tasks
- Count per status (e.g., "2 pending, 1 in-progress, 3 done")
- Next eligible task (lowest-numbered `pending` task whose dependencies are all `done`), or "All tasks complete!" if none remain

## Constraints

- This is a **read-only** skill — do NOT modify any files
- Do NOT launch any subagents
- Keep the output concise and scannable
