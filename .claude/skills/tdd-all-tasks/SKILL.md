# /tdd-all-tasks — Run All Remaining Tasks

Runs `/tdd-next-task` repeatedly until all tasks are done or a failure occurs.

## Usage

```
/tdd-all-tasks
```

## Instructions

When the user invokes `/tdd-all-tasks`, follow this process:

### 1. Show Initial Status

- Run `/tdd-show-tasks` to display the current state of all tasks
- Count how many tasks are not yet `done`
- If all tasks are already `done`, report "All tasks complete!" and stop

### 2. Loop

Repeat the following:

1. Run `/tdd-next-task` to execute the full TDD cycle for the next eligible task
2. If `/tdd-next-task` reports **no eligible tasks**, all tasks are complete — go to step 3
3. If `/tdd-next-task` **fails** (tests can't pass, stuck after retries, or any other error), **stop immediately** and report:
   - Which task failed
   - The failure reason
   - How many tasks were completed before the failure
4. On success, briefly report progress: "Completed X/Y tasks" and continue the loop

### 3. Final Report

When all tasks are done (or after failure), run `/tdd-show-tasks` to display the final state.

## Error Handling

| Scenario | Action |
|----------|--------|
| All tasks already done | Report and stop |
| No eligible tasks (unmet dependencies) | Report which tasks are blocked and stop |
| Any task fails | Stop immediately, report failure and progress |
