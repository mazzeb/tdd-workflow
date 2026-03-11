# /tdd-quick — ⚡ Quick TDD Cycle

Plan and implement a small change in one shot. Creates a single task file, then immediately runs the appropriate workflow based on task type.

Use this for focused, single-behavior changes — a bug fix, a small feature, a targeted refactor. If the work involves multiple stories or complex decomposition, use `/tdd-plan` instead and then `/tdd-next-task` to execute.

## Usage

```
/tdd-quick fix the off-by-one error in pagination
/tdd-quick add a health check endpoint at GET /health
/tdd-quick refactor extractUser to return a Result type
```

`$ARGUMENTS` must contain a description of the change. If empty, ask the user what they want to build.

## Instructions

### 1. Explore the Codebase

Build enough context to write precise ACs — this is the same exploration tdd-plan does, just faster and more targeted since you're looking at one behavior.

- Read `CLAUDE.md` at the project root for test commands, file conventions, and framework context
- Use Glob and Grep to find:
  - The specific code area the change touches
  - Existing test patterns (runner, assertion style, file naming)
  - Related code that might be affected
- Check `_tasks/` for existing task files to determine the next number

### 2. Scope Check

This skill is for **one task**. Before proceeding, assess whether the change is truly a single, focused behavior:

- **Good fit**: "fix the 404 on /users/:id when ID contains dots", "add request logging middleware", "rename `fetchData` to `fetchUsers` across the codebase"
- **Too big**: "add user authentication", "refactor the entire API layer", "build a dashboard"

If the change would need multiple stories (more than ~5 ACs, touches many unrelated areas, or has sub-features), tell the user:
> "This looks like it needs multiple stories. Use `/tdd-plan` to break it down, then `/tdd-next-task` to implement."

Do not proceed with an oversized task — splitting later is expensive.

### 3. Write the Task File

Create a single task file in `_tasks/` using the template from this skill's sibling at `.claude/skills/tdd-plan/template.md`:

- Number continues from the highest existing task file (or starts at `001`)
- Filename: `NNN-short-slug.md`
- Set `status: pending`, `priority: medium` (unless the user specified otherwise), `depends-on: []`
- Set `type` based on the nature of the change:
  - `feature` — new behavior that needs tests first (default)
  - `bugfix` — reproducing a bug with a test, then fixing
  - `refactor` — restructuring while existing tests stay green
  - `test` — adding/improving test coverage only
  - `chore` — config, deps, CI, docs
- Write a **Description** with enough context for the Red/Green/Verify agents to work independently
- Write **Acceptance Criteria** — every AC must be specific enough to derive a test assertion from:
  - `Given/When/Then` format for behavioral ACs (name concrete values, functions, endpoints)
  - `[REMOVE]` prefix for deletion ACs (name the specific functions, classes, files being removed)
- Add **Technical Notes** with relevant file paths, existing patterns to follow, and implementation hints discovered during exploration

### 4. Run the Appropriate Workflow

Determine the phase sequence from the task's `type` field:
- **feature / bugfix**: Red → Green → Verify
- **refactor / chore**: Green → Verify
- **test**: Red → Verify

Execute the cycle exactly as `/tdd-next-task` does — each phase runs sequentially in its own subagent via the **Agent tool**.

**Tracking changed files**: Maintain a cumulative list of files changed across all phases. Each agent outputs a `## Changed Files` section at the end of its response — extract those file paths and accumulate them. This list is used at commit time to stage only the files belonging to this task.

**Bridging status**: When a phase is skipped, update the task file's frontmatter to the status the next agent expects (e.g., set `status: in-progress` before Green when Red was skipped; set `status: in-review` before Verify when Green was skipped). Add the task file to the accumulated Changed Files list when bridging.

#### 🔴 Red Phase (feature, bugfix, test)
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-red/tdd-red.md"` and prompt: `"Write failing tests for task NNN in _tasks/. Follow your complete process."`
- If tests pass unexpectedly, stop and report to the user
- **Extract the `## Changed Files` list** from the agent's response and start the accumulated file list

#### 🟢 Green Phase (feature, bugfix, refactor, chore)
- **If Red was skipped**: update the task file's frontmatter to `status: in-progress` before launching
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-green/tdd-green.md"` and prompt: `"Write minimum implementation for task NNN in _tasks/. Follow your complete process."`
- If tests can't pass, stop and report to the user
- **Extract the `## Changed Files` list** and merge into the accumulated file list (deduplicate)

#### 🔍 Verify Phase (all types)
- **If Green was skipped**: update the task file's frontmatter to `status: in-review` before launching
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-verify/tdd-verify.md"` and prompt: `"Verify task NNN from _tasks/. Check tests and implementation against all ACs. Follow your complete process."`
- **Extract the `## Changed Files` list** and merge into the accumulated file list
- If Verify **passes**: cycle complete
- If Verify **rejects**: route back based on task type:
  - **feature/bugfix**: test issues → Red, implementation issues → Green, both → Red then Green
  - **refactor/chore**: any issues → Green (bridge status to `in-progress`)
  - **test**: any issues → Red (status already `pending` from Verify rejection)

Maximum **3 retry loops**. If still failing, stop and report the accumulated feedback.

### 5. Commit

Every completed task gets its own git commit for traceability.

- Use `git add` with the **exact file paths from the accumulated Changed Files list** — do not use `git add -A` or `git add .`
- For files tagged `(deleted)`, use `git add` on them too (git stages deletions)
- After staging, run `git status` and verify only this task's files are staged. Unstage unexpected files with `git reset HEAD <file>`
- Commit with message: `feat(TDD-<number>): <task title>`
- Do NOT push to remote
- **Fallback**: If agents didn't produce `## Changed Files`, fall back to `git status` but log a warning

### 6. Report

After committing:
- Confirm the task is `done`
- List what was created (test files, source files, task file)
- Show the commit hash

## Constraints

- **Single task only** — refuse multi-story requests, direct to `/tdd-plan`
- **No skipping phases** — every task runs its full workflow for its type (never skip Verify)
- **Sequential phases** — each phase must complete before the next starts
- **Agent tool only** — use `agent_path` to launch Red/Green/Verify, do not inline their logic
- **Mandatory commit** — always commit on success, never push

## Error Handling

| Scenario | Action |
|----------|--------|
| No `$ARGUMENTS` | Ask what the user wants to build |
| Change is too big | Direct to `/tdd-plan` + `/tdd-next-task` |
| Red: tests pass unexpectedly | Stop — feature may already exist |
| Green: can't make tests pass | Stop — developer needs to intervene |
| Verify: rejects after 3 retries | Stop, report accumulated feedback |
