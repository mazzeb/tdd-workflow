# /tdd-next-task — Full TDD Cycle

Orchestrates the appropriate TDD workflow for the next eligible task, with automatic retry on Verify rejection.

## Usage

```
/tdd-next-task       # Pick next eligible task and run full cycle
```

## Workflow Routing

Each task has a `type` field in its frontmatter that determines which phases run. If `type` is missing, default to `feature`.

| Type | Phases | Status flow |
|------|--------|-------------|
| `feature` | Red → Green → Verify | pending → in-progress → in-review → done |
| `bugfix` | Red → Green → Verify | pending → in-progress → in-review → done |
| `refactor` | Green → Verify | pending → (bridge to in-progress) → in-review → done |
| `test` | Red → Verify | pending → in-progress → (bridge to in-review) → done |
| `chore` | Green → Verify | pending → (bridge to in-progress) → in-review → done |

**"Bridging" status**: When a phase is skipped, the orchestrator must update the task file's status before launching the next agent, because agents validate status on entry. For example, for a `refactor` task, Green expects `in-progress` — so before launching Green, update the task frontmatter from `pending` to `in-progress`.

## Instructions

When the user invokes `/tdd-next-task`, orchestrate the appropriate TDD cycle:

### 1. Find the Next Eligible Task

Read all `.md` files directly in `_tasks/` (not subdirectories — exclude `_tasks/_archive/`) and check for resumable or eligible tasks in this priority order:

1. **`in-review`** — implementation complete, pick the lowest-numbered match → resume at Verify phase
2. **`in-progress`** — tests written, pick the lowest-numbered match → resume at Green phase
3. **`pending`** — not yet started, exclude tasks whose `depends-on` references any task that is not `status: done` **or archived** (tasks in `_tasks/_archive/` are implicitly done — use Glob on `_tasks/_archive/` to get archived task numbers from filenames, no need to read them), pick the lowest-numbered eligible match → start full Red → Green → Verify cycle

If no task matches any of these, report "No eligible tasks found" and stop.

### 2. Report Selection

Tell the user:
- Which task was selected (number, title, and type)
- Which workflow will run (e.g., "Type: refactor → Green → Verify")
- Summarize its acceptance criteria
- Note any dependencies
- If resuming, state which phase is being resumed and why (e.g., "Resuming at Green — task is `in-progress`")

### 3. Run the TDD Cycle

Determine the phase sequence from the task's `type` field (default `feature`):
- **feature / bugfix**: Red → Green → Verify
- **refactor / chore**: Green → Verify
- **test**: Red → Verify

Execute the phases **in order**, each in its own subagent via the **Agent tool**. If resuming a task, skip phases that already completed (e.g., if resuming at Green, skip Red; if resuming at Verify, skip Red and Green).

Each phase must fully complete before launching the next — they are sequential because each phase depends on the previous phase's output.

**Post-phase status validation**: After each agent completes, read the task file and verify the status is one of the valid values (`pending`, `in-progress`, `in-review`, `done`). If the status is anything else (e.g., a phase name like "red", "green", "verify"), fix it to the expected value before proceeding:
- After Red: status must be `in-progress`
- After Green: status must be `in-review`
- After Verify (pass): status must be `done`

**Tracking changed files**: Maintain a cumulative list of files changed across all phases. Each agent outputs a `## Changed Files` section at the end of its response — extract those file paths and accumulate them. This list is used at commit time to stage only the files belonging to this task, which is critical for parallel task execution where multiple tasks may have uncommitted changes simultaneously.

**Bridging status before a phase**: Agents validate their expected status on entry. When a phase is skipped, the orchestrator must update the task file's frontmatter to the status the next agent expects:
- Before Green (when Red was skipped): set `status: in-progress`
- Before Verify (when Green was skipped): set `status: in-review`
- Add the task file to the accumulated Changed Files list when bridging

#### 🔴 Red Phase (feature, bugfix, test)
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-red/tdd-red.md"` and prompt: `"Write failing tests for task XXX in _tasks/. Follow your complete process."`
- If the subagent reports tests pass unexpectedly, stop and report to the user
- **Extract the `## Changed Files` list** from the agent's response and add to the accumulated file list
- On success, report: "🔴 Red phase complete — failing tests written"

#### 🟢 Green Phase (feature, bugfix, refactor, chore)
- **If Red was skipped** (refactor/chore): update the task file's frontmatter to `status: in-progress` before launching this phase
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-green/tdd-green.md"` and prompt: `"Write minimum implementation for task XXX in _tasks/. Follow your complete process."`
- If the subagent cannot make tests pass, stop and report to the user
- **Extract the `## Changed Files` list** from the agent's response and merge into the accumulated file list (deduplicate — the task file will appear in multiple phases)
- On success, report: "🟢 Green phase complete — all tests passing"

#### 🔍 Verify Phase (all types)
- **If Green was skipped** (test): update the task file's frontmatter to `status: in-review` before launching this phase
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-verify/tdd-verify.md"` and prompt: `"Verify task XXX from _tasks/. Check tests and implementation against all ACs. Follow your complete process."`
- **Extract the `## Changed Files` list** from the agent's response and merge into the accumulated file list
- If Verify **passes**: report "🔍 Task XXX verified and marked as done" — cycle complete
- If Verify **rejects**: route back to the appropriate phase based on task type and rejection reason:

**Rejection routing by type:**

| Type | Test issues (Red rejection) | Implementation issues (Green rejection) | Both |
|------|----------------------------|----------------------------------------|------|
| feature / bugfix | → Red | → Green | → Red, then Green |
| refactor / chore | N/A — route to Green (tests aren't this workflow's responsibility) | → Green | → Green |
| test | → Red | N/A — route to Red (no implementation phase) | → Red |

When looping back, bridge the status if needed (e.g., for refactor, set `status: in-progress` before relaunching Green, regardless of what Verify set the status to).

### 4. Retry Limit

- Maximum **3 retry loops** (3 full Verify rejections)
- If still failing after 3 attempts, stop and report:
  - Which task is stuck
  - The accumulated feedback
  - Suggest the developer review the task manually

### 5. Commit (mandatory — do not skip)

Every completed task gets its own git commit. This is essential for traceability — it lets the developer review, revert, or cherry-pick individual tasks. Skipping the commit means the work is effectively lost from the TDD workflow's perspective.

**Scoped commits**: Only stage files that belong to this task. The accumulated `Changed Files` list from the Red, Green, and Verify phases tells you exactly which files to commit. This prevents accidentally committing unrelated changes (e.g., from a parallel task or manual edits).

- Use `git add` with the **exact file paths from the accumulated Changed Files list** — do not use `git add -A` or `git add .`
- For files tagged `(deleted)` in the list, use `git add` on them too (git stages deletions this way)
- After staging, run `git status` and verify that **only** the task's files are staged. If unexpected files appear in the staged area, unstage them with `git reset HEAD <file>` before committing
- Create a commit with message: `feat(TDD-<number>): <task title>`
- Do NOT push to remote

**Fallback**: If the agents didn't produce a `## Changed Files` section (e.g., older agent versions), fall back to `git status` to discover changes — but log a warning that scoped tracking wasn't available.

### 6. Completion

After committing:
- Confirm the task is marked as `done`
- Report what was created (test files, source files)
- Show the commit hash
- Suggest running `/tdd-next-task` again for the next task

## Subagents Used

- `tdd-red` — Writes failing tests (QA Engineer persona) — used by: feature, bugfix, test
- `tdd-green` — Writes minimum implementation (Pragmatic Developer persona) — used by: feature, bugfix, refactor, chore
- `tdd-verify` — Reviews against ACs (Senior Code Reviewer persona) — used by: all types

## Error Handling

| Scenario | Action |
|----------|--------|
| No eligible tasks | Report and stop |
| Unknown task type | Treat as `feature` (full Red → Green → Verify) |
| Red: tests pass unexpectedly | Report and stop — feature may already exist |
| Green: can't make tests pass | Report and stop — developer needs to intervene |
| Verify: rejects after 3 retries | Report accumulated feedback and stop |
| Dependency not met | Skip task, report no eligible tasks |
