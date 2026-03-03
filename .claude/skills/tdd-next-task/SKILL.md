# /tdd-next-task — Full Red → Green → Verify Cycle

Orchestrates the complete TDD cycle for the next eligible task, with automatic retry on Verify rejection.

## Usage

```
/tdd-next-task       # Pick next eligible task and run full cycle
```

## Instructions

When the user invokes `/tdd-next-task`, orchestrate the full TDD cycle:

### 1. Find the Next Eligible Task

Read all files in `_tasks/` and check for resumable or eligible tasks in this priority order:

1. **`in-review`** — implementation complete, pick the lowest-numbered match → resume at Verify phase
2. **`in-progress`** — tests written, pick the lowest-numbered match → resume at Green phase
3. **`pending`** — not yet started, exclude tasks whose `depends-on` references any task that is not `status: done`, pick the lowest-numbered eligible match → start full Red → Green → Verify cycle

If no task matches any of these, report "No eligible tasks found" and stop.

### 2. Report Selection

Tell the user:
- Which task was selected (number and title)
- Summarize its acceptance criteria
- Note any dependencies
- If resuming, state which phase is being resumed and why (e.g., "Resuming at Green — task is `in-progress`")

### 3. Run the TDD Cycle

Execute the following phases in order, using subagents. If resuming a task, skip phases that already completed (e.g., if resuming at Green, skip Red; if resuming at Verify, skip Red and Green):

#### 🔴 Red Phase
- Launch the `tdd-red` subagent to write failing tests for the selected task
- If the subagent reports tests pass unexpectedly, stop and report to the user
- On success, report: "🔴 Red phase complete — failing tests written"

#### 🟢 Green Phase
- Launch the `tdd-green` subagent to write minimum implementation for the selected task
- If the subagent cannot make tests pass, stop and report to the user
- On success, report: "🟢 Green phase complete — all tests passing"

#### 🔍 Verify Phase
- Launch the `tdd-verify` subagent to review tests and implementation against ACs
- If Verify **passes**: report "🔍 Task XXX verified and marked as done" — cycle complete
- If Verify **rejects with test issues** (Red rejection):
  - Report the feedback summary
  - Loop back to Red Phase
- If Verify **rejects with implementation issues** (Green rejection):
  - Report the feedback summary
  - Loop back to Green Phase
- If Verify **rejects with both issues**:
  - Report the feedback summary
  - Loop back to Red Phase (Red goes first, then Green)

### 4. Retry Limit

- Maximum **3 retry loops** (3 full Verify rejections)
- If still failing after 3 attempts, stop and report:
  - Which task is stuck
  - The accumulated feedback
  - Suggest the developer review the task manually

### 5. Commit

When the cycle completes successfully, create a git commit:
- Run `git status` to discover all modified, added, and untracked files
- Stage **all** changes: test files, source/implementation files, and the task file in `_tasks/`
- Use `git add` with explicit file paths (not `git add -A`) to stage each changed file
- Verify with `git status` that all expected files are staged before committing
- Create a commit with message: `feat(TDD-<number>): <task title>`
- Do NOT push to remote

### 6. Completion

After committing:
- Confirm the task is marked as `done`
- Report what was created (test files, source files)
- Show the commit hash
- Suggest running `/tdd-next-task` again for the next task

## Subagents Used

- `tdd-red` — Writes failing tests (QA Engineer persona)
- `tdd-green` — Writes minimum implementation (Pragmatic Developer persona)
- `tdd-verify` — Reviews against ACs (Senior Code Reviewer persona)

## Error Handling

| Scenario | Action |
|----------|--------|
| No eligible tasks | Report and stop |
| Red: tests pass unexpectedly | Report and stop — feature may already exist |
| Green: can't make tests pass | Report and stop — developer needs to intervene |
| Verify: rejects after 3 retries | Report accumulated feedback and stop |
| Dependency not met | Skip task, report no eligible tasks |
