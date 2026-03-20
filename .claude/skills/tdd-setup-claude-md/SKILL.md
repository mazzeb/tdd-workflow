# /tdd-setup-claude-md — Add TDD Workflow Rules to CLAUDE.md

Adds or updates the TDD Workflow Rules section in the project's CLAUDE.md. Creates the file if it doesn't exist.

## Usage

```
/tdd-setup-claude-md
```

## Instructions

### 1. Check for Existing CLAUDE.md

- Use Glob to check if `CLAUDE.md` exists in the project root
- If it exists, read it with the Read tool
- Look for a `## TDD Workflow Rules` heading to detect an existing section

### 2. Determine Action

- **No CLAUDE.md**: Create a new file with the TDD rules section (use Write)
- **CLAUDE.md exists, no TDD section**: Append the TDD rules section to the end of the file (use Edit — match the last line of the file and add the section after it)
- **CLAUDE.md exists, has TDD section**: Replace the entire section from `## TDD Workflow Rules` up to (but not including) the next `## ` heading or end of file (use Edit)

### 3. TDD Rules Content

The section to inject is exactly:

```markdown
## TDD Workflow Rules

All implementation work in this project follows the TDD workflow. These rules apply to every conversation, whether or not a `/tdd-` command was explicitly invoked.

### Always plan before implementing
- When asked to implement, add, fix, or refactor something, use `/tdd-plan` (or `/tdd-quick` for small, single-behavior changes) to create task files first.
- Then use `/tdd-next-task` or `/tdd-all-tasks` to execute tasks through the Red → Green → Verify cycle.
- Never write implementation code without a corresponding task file in `_tasks/`.
- Never write tests and implementation code in the same step — they are separate phases (Red writes tests, Green writes implementation).
- **This applies even when other skills are triggered.** If a non-TDD skill (e.g., `frontend-design`) would produce code changes, route the request through `/tdd-plan` or `/tdd-quick` first. The other skill's output can inform the plan, but code must still flow through the TDD cycle.

### Respect the planning phase
- When `/tdd-plan` is active and has asked the developer clarifying questions, **do not proceed until they answer**. Stay in the planning conversation.
- Never start implementing, writing tests, or creating task files while planning questions are still unanswered.
- Planning feels slow but prevents expensive rework downstream. Incomplete plans produce vague acceptance criteria, which produce wrong tests, which produce wrong code.

### Workflow commands
| Command | Purpose |
|---------|---------|
| `/tdd-plan` | Plan and create task files (start here) |
| `/tdd-quick` | Plan + implement a single small change |
| `/tdd-next-task` | Execute the next pending task |
| `/tdd-all-tasks` | Execute all remaining tasks |
| `/tdd-show-tasks` | Show task status dashboard |
| `/tdd-archive` | Archive completed tasks to `_tasks/_archive/` |
| `/tdd-setup-claude-md` | Add/update TDD workflow rules in CLAUDE.md |
```

### 4. Report

After the edit, report what was done:

- **Created**: "Created CLAUDE.md with TDD Workflow Rules."
- **Appended**: "Appended TDD Workflow Rules section to existing CLAUDE.md."
- **Updated**: "Updated existing TDD Workflow Rules section in CLAUDE.md."

Then remind the user:
```
Next steps:
  1. Add your project's test commands to CLAUDE.md (e.g., `npm test`, `pytest`)
  2. Add file conventions (e.g., test files in `__tests__/`, `*.test.ts`)
  3. Run /tdd-plan to create your first stories
```

## Constraints

- Do NOT modify any content outside the TDD Workflow Rules section
- Do NOT add HTML comment markers — use the `## TDD Workflow Rules` heading as the section identifier
- Do NOT push to git — the user can commit separately
- Preserve all existing content in CLAUDE.md when appending or updating

## Tools Available

Read, Write, Edit, Glob
