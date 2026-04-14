# /tdd-setup-claude-md — Add TDD Workflow Rules to CLAUDE.md

Adds or updates the TDD Workflow Rules section in the project's CLAUDE.md. Creates the file if it doesn't exist. Also asks the user to choose their task tracking backend (file-based or Beads).

## Usage

```
/tdd-setup-claude-md
```

## Instructions

### 1. Choose Task Tracking Backend

Ask the user which task tracking backend they want to use:

> **Which task tracking backend would you like to use?**
>
> 1. **File-based** (`_tasks/` directory) — Tasks are markdown files with YAML frontmatter. Simple, no extra dependencies.
> 2. **Beads** (`bd` CLI) — Git-backed issue tracker with dependency graph, designed for AI agents. Requires `bd` to be installed.

Wait for their answer. Default to **file-based** if they don't have a preference.

### 2. Write Config

Write `.claude/tdd-config.json` with the chosen backend:

**File-based:**
```json
{
  "backend": "files"
}
```

**Beads:**
```json
{
  "backend": "beads"
}
```

Create the `.claude/` directory if it doesn't exist.

### 3. Initialize Backend (if Beads)

If the user chose Beads:
1. Check if `bd` is available by running `which bd` or `bd --version`
2. If `bd` is not installed, tell the user:
   > Beads (`bd`) is not installed. Install it with:
   > - `brew install beads`
   > - `npm i -g @beads/bd`
   > - Or see https://github.com/steveyegge/beads
   >
   > Run `/tdd-setup-claude-md` again after installing.

   Stop here — do not proceed without `bd`.
3. If `bd` is available, check if `.beads/` directory exists
4. If `.beads/` doesn't exist, run `bd init` to initialize the Beads database

### 4. Detect & Offer Migration

After the backend is initialized, check if there are existing tasks in the **other** backend and offer to migrate them.

#### If user chose Beads → check for file-based tasks
1. Glob `_tasks/*.md` (exclude `_tasks/_archive/`)
2. If active task files exist, read each and collect: number, title, type, status, priority, depends-on, description, ACs, technical notes, notes, feedback
3. Tell the user:
   > Found **N** active task files in `_tasks/`. Would you like to migrate them to Beads?
   >
   > This will:
   > - Create a Beads issue for each active task (pending, in-progress, in-review)
   > - Preserve status, type, priority, dependencies, ACs, and feedback
   > - Move the original files to `_tasks/_migrated/` (not deleted, in case you need them)
   >
   > Done/archived tasks won't be migrated — they're historical.
4. If the user confirms, for each active task file (in number order, so dependency IDs are available):
   a. Create the Beads issue:
      ```
      bd create "<title>" -t <beads-type> -p <beads-priority> --json
      ```
      Type mapping: `feature` → `feature`, `bugfix` → `bug`, `refactor` → `task`, `test` → `task`, `chore` → `task`
      Priority mapping: `high` → `1`, `medium` → `2`, `low` → `3`
   b. Add type labels for non-direct mappings (`refactor`, `test-only`, `chore`)
   c. Set fields (use heredocs for multiline content with special characters):
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
   d. Set dependencies using a mapping of old task numbers → new Beads IDs (built as you go):
      ```
      bd dep add <new-id> <mapped-dep-id>
      ```
      If a dependency references an archived/done task not in Beads, skip it (the dependency is already satisfied)
   e. Set status:
      - `pending`: no action (default `open`)
      - `in-progress`: `bd update <id> --claim`
      - `in-review`: `bd update <id> --claim --add-label in-review`
   f. If the task has a `## Feedback` section: `bd comment add <id> "<feedback content>"`
   g. Keep a mapping table: `{old-number: new-beads-id}` for dependency resolution and the report
5. After all tasks are migrated:
   - Create `_tasks/_migrated/` directory
   - Move migrated files: `mv _tasks/NNN-slug.md _tasks/_migrated/NNN-slug.md`
   - Report the mapping table:
     ```
     Migrated N tasks:
       001 (auth-login) → bd-a1b2
       002 (session-mgmt) → bd-c3d4
       ...
     Original files moved to _tasks/_migrated/
     ```
6. If the user declines, skip migration and continue with step 5

#### If user chose Files → check for Beads issues
1. Check if `.beads/` directory exists
2. If it does, run `bd list --status open --json` and `bd list --status in_progress --json`
3. If active Beads issues exist, tell the user:
   > Found **N** active Beads issues. Would you like to migrate them to file-based tasks?
   >
   > This will:
   > - Create a task file in `_tasks/` for each active issue
   > - Preserve status, type, priority, dependencies, ACs, and feedback
   > - Close the original Beads issues with reason "Migrated to file-based tasks"
4. If the user confirms, for each active Beads issue:
   a. Read issue details: `bd show <id> --json`
   b. Read comments for feedback: `bd comment list <id> --json`
   c. Determine the next file number (check `_tasks/` and `_tasks/_archive/`)
   d. Map fields:
      - `type`: `bug` → `bugfix`; `task` with `refactor` label → `refactor`; `task` with `test-only` label → `test`; `task` with `chore` label → `chore`; else → `feature`
      - `status`: `open` → `pending`; `in_progress` without `in-review` label → `in-progress`; `in_progress` with `in-review` label → `in-review`
      - `priority`: `0`/`1` → `high`, `2` → `medium`, `3`/`4` → `low`
   e. Map dependencies using `{beads-id: file-number}` table (built as you go). If a dep references a closed Beads issue not being migrated, skip it
   f. Write the task file to `_tasks/NNN-slug.md` using the standard template
   g. If feedback comments exist, add a `## Feedback` section to the file
   h. Keep a mapping table: `{beads-id: file-number}`
5. After all issues are migrated:
   - Close original Beads issues: `bd close <id> --reason "Migrated to file-based task NNN"`
   - Report the mapping table:
     ```
     Migrated N issues:
       bd-a1b2 (Auth login) → 001-auth-login.md
       bd-c3d4 (Session mgmt) → 002-session-mgmt.md
       ...
     Original Beads issues closed with migration note.
     ```
6. If the user declines, skip migration and continue with step 5

### 5. Check for Existing CLAUDE.md

- Use Glob to check if `CLAUDE.md` exists in the project root
- If it exists, read it with the Read tool
- Look for a `## TDD Workflow Rules` heading to detect an existing section

### 6. Determine Action

- **No CLAUDE.md**: Create a new file with the TDD rules section (use Write)
- **CLAUDE.md exists, no TDD section**: Append the TDD rules section to the end of the file (use Edit — match the last line of the file and add the section after it)
- **CLAUDE.md exists, has TDD section**: Replace the entire section from `## TDD Workflow Rules` up to (but not including) the next `## ` heading or end of file (use Edit)

### 7. TDD Rules Content

Inject the appropriate content based on the chosen backend:

**For file-based backend:**

```markdown
## TDD Workflow Rules

All implementation work in this project follows the TDD workflow. These rules apply to every conversation, whether or not a `/tdd-` command was explicitly invoked.

**Task tracking backend: file-based** (`_tasks/` directory)

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

**For Beads backend:**

```markdown
## TDD Workflow Rules

All implementation work in this project follows the TDD workflow. These rules apply to every conversation, whether or not a `/tdd-` command was explicitly invoked.

**Task tracking backend: Beads** (`bd` CLI)

### Always plan before implementing
- When asked to implement, add, fix, or refactor something, use `/tdd-plan` (or `/tdd-quick` for small, single-behavior changes) to create tasks first.
- Then use `/tdd-next-task` or `/tdd-all-tasks` to execute tasks through the Red → Green → Verify cycle.
- Never write implementation code without a corresponding Beads issue.
- Never write tests and implementation code in the same step — they are separate phases (Red writes tests, Green writes implementation).
- **This applies even when other skills are triggered.** If a non-TDD skill (e.g., `frontend-design`) would produce code changes, route the request through `/tdd-plan` or `/tdd-quick` first. The other skill's output can inform the plan, but code must still flow through the TDD cycle.

### Respect the planning phase
- When `/tdd-plan` is active and has asked the developer clarifying questions, **do not proceed until they answer**. Stay in the planning conversation.
- Never start implementing, writing tests, or creating task files while planning questions are still unanswered.
- Planning feels slow but prevents expensive rework downstream. Incomplete plans produce vague acceptance criteria, which produce wrong tests, which produce wrong code.

### Workflow commands
| Command | Purpose |
|---------|---------|
| `/tdd-plan` | Plan and create Beads issues (start here) |
| `/tdd-quick` | Plan + implement a single small change |
| `/tdd-next-task` | Execute the next pending task |
| `/tdd-all-tasks` | Execute all remaining tasks |
| `/tdd-show-tasks` | Show task status dashboard |
| `/tdd-archive` | Archive completed tasks (automatic with Beads) |
| `/tdd-setup-claude-md` | Add/update TDD workflow rules in CLAUDE.md |
```

### 8. Report

After the edit, report what was done:

- **Created**: "Created CLAUDE.md with TDD Workflow Rules."
- **Appended**: "Appended TDD Workflow Rules section to existing CLAUDE.md."
- **Updated**: "Updated existing TDD Workflow Rules section in CLAUDE.md."
- **Backend**: "Task tracking backend set to: <files|beads>"

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

Read, Write, Edit, Glob, Bash (for `bd` commands, `which`, `mkdir -p`)
