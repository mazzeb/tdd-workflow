# /tdd-all-tasks — Run All Remaining Tasks

Runs `/tdd-next-task` repeatedly until all tasks are done or a failure occurs.

## Usage

```
/tdd-all-tasks
```

## Critical Execution Model

This skill is a **sequential loop**, not a parallel dispatcher. Each task must fully complete (including its git commit) before the next one starts. Here's why:

- `/tdd-next-task` runs Red → Green → Verify → **commit** as one atomic cycle
- Later tasks may depend on code written by earlier tasks
- The commit-per-task history is essential for traceability and safe rollback

Each `/tdd-next-task` cycle uses **scoped commits** — it only stages and commits the files that its Red/Green/Verify phases actually touched, not all uncommitted changes. This means unrelated edits or files from other work won't be swept into a task's commit.

**You MUST use the Skill tool** to invoke `/tdd-next-task`. Do not inline its logic, do not launch subagents to run tasks in parallel, and do not attempt to "optimize" by running multiple tasks at once. The sequential design is intentional.

## Instructions

### 1. Show Initial Status

- Use the Skill tool to invoke `/tdd-show-tasks`
- Count how many tasks are not yet `done`
- If all tasks are already `done`, report "All tasks complete!" and stop

### 2. Sequential Loop

Repeat the following **one task at a time**:

1. Use the **Skill tool** to invoke `/tdd-next-task` — this runs the full Red → Green → Verify → commit cycle for one task
2. Wait for it to fully complete (including the git commit) before continuing
3. If `/tdd-next-task` reports **no eligible tasks**, all remaining tasks are complete — go to step 3
4. If `/tdd-next-task` **fails** (tests can't pass, stuck after retries, or any error), **stop immediately** and report:
   - Which task failed
   - The failure reason
   - How many tasks were completed before the failure
5. On success, briefly report progress: "Completed X/Y tasks" and continue the loop

### 3. Final Report

When all tasks are done (or after failure), use the Skill tool to invoke `/tdd-show-tasks` to display the final state.

## Constraints

- **Sequential only** — invoke `/tdd-next-task` once, wait for completion, then invoke again
- **Skill tool only** — always use the Skill tool to call `/tdd-next-task` and `/tdd-show-tasks`
- **No subagents** — do not use the Agent tool to parallelize work
- **No inlining** — do not copy or replicate the logic from tdd-next-task; delegate to it via Skill tool
- **Stop on failure** — do not skip failed tasks or try to continue past errors

## Error Handling

| Scenario | Action |
|----------|--------|
| All tasks already done | Report and stop |
| No eligible tasks (unmet dependencies) | Report which tasks are blocked and stop |
| Any task fails | Stop immediately, report failure and progress |
