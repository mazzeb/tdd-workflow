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

Execute the following phases **in order**, each in its own subagent via the **Agent tool**. If resuming a task, skip phases that already completed (e.g., if resuming at Green, skip Red; if resuming at Verify, skip Red and Green).

Each phase must fully complete before launching the next — they are sequential because each phase depends on the previous phase's output (Green needs Red's tests, Verify needs Green's implementation).

**Tracking changed files**: Maintain a cumulative list of files changed across all phases. Each agent outputs a `## Changed Files` section at the end of its response — extract those file paths and accumulate them. This list is used at commit time to stage only the files belonging to this task, which is critical for parallel task execution where multiple tasks may have uncommitted changes simultaneously.

#### 🔴 Red Phase
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-red/tdd-red.md"` and prompt: `"Write failing tests for task XXX in _tasks/. Follow your complete process."`
- If the subagent reports tests pass unexpectedly, stop and report to the user
- **Extract the `## Changed Files` list** from the agent's response and add to the accumulated file list
- On success, report: "🔴 Red phase complete — failing tests written"

#### 🟢 Green Phase
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-green/tdd-green.md"` and prompt: `"Write minimum implementation for task XXX in _tasks/. Follow your complete process."`
- If the subagent cannot make tests pass, stop and report to the user
- **Extract the `## Changed Files` list** from the agent's response and merge into the accumulated file list (deduplicate — the task file will appear in multiple phases)
- On success, report: "🟢 Green phase complete — all tests passing"

#### 🔍 Verify Phase
- Use the **Agent tool** with `agent_path=".claude/agents/tdd-verify/tdd-verify.md"` and prompt: `"Verify task XXX from _tasks/. Check tests and implementation against all ACs. Follow your complete process."`
- **Extract the `## Changed Files` list** from the agent's response and merge into the accumulated file list
- If Verify **passes**: report "🔍 Task XXX verified and marked as done" — cycle complete
- If Verify **rejects with test issues** (Red rejection):
  - Report the feedback summary
  - Loop back to Red Phase (keep the accumulated file list — new phases will add to it)
- If Verify **rejects with implementation issues** (Green rejection):
  - Report the feedback summary
  - Loop back to Green Phase (keep the accumulated file list)
- If Verify **rejects with both issues**:
  - Report the feedback summary
  - Loop back to Red Phase (Red goes first, then Green)

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
