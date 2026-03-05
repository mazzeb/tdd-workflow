# /tdd-verify — 🔍 Verify Tests & Implementation Against ACs

Delegates to the `tdd-verify` subagent (Senior Code Reviewer persona).

## Usage

```
/tdd-verify          # Auto-picks current in-progress task
/tdd-verify 3        # Verify task 003
```

## Instructions

When the user invokes `/tdd-verify`, delegate the work to the `tdd-verify` subagent:

1. Parse the optional task number argument from `$ARGUMENTS`
2. Launch the `tdd-verify` subagent with the following prompt:

---

**If task number provided:**
> Review task $TASK_NUMBER from the `_tasks/` directory. Verify that tests and implementation correctly fulfill all acceptance criteria. Follow your complete process as defined in your agent instructions.

**If no task number:**
> Auto-select the current in-progress task from `_tasks/`. Verify that tests and implementation correctly fulfill all acceptance criteria. Follow your complete process as defined in your agent instructions.

---

3. Report the subagent's results back to the user:
   - Which task was reviewed
   - Verdict: **🔍 passed** (task marked done) or **🔍 rejected** (with feedback summary)
   - If rejected: what phase needs to re-run (Red, Green, or both)
   - Summary of specific findings

## Subagent

- **Agent:** `tdd-verify` (`.claude/agents/tdd-verify/tdd-verify.md`)
- **Persona:** Senior Code Reviewer
