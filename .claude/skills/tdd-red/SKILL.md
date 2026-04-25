# /tdd-red — 🔴 Write Failing Tests

Delegates to the `tdd-red` subagent (Strict QA Engineer persona).

## Usage

```
/tdd-red           # Auto-picks next pending task (respecting depends-on)
/tdd-red 3         # Write tests for task 003
```

## Instructions

When the user invokes `/tdd-red`, delegate the work to the `tdd-red` subagent:

1. Parse the optional task number argument from `$ARGUMENTS`
2. Use the **Agent tool** with `subagent_type="tdd-red"` and the following prompt:

**If task number provided:**
> Write failing tests for task $TASK_NUMBER. Follow your complete process.

**If no task number:**
> Auto-select the next eligible pending task. Write failing tests for all its acceptance criteria. Follow your complete process.

3. Report the subagent's results back to the user:
   - Which task was selected
   - What test files were created/modified
   - Confirmation that tests fail (🔴 Red phase complete)
   - Any issues encountered (e.g., tests passing unexpectedly)
   - The **Changed Files** list from the agent's output — preserve this exactly, as orchestrators depend on it for scoped commits

## Subagent

- **Agent:** `tdd-red` (`.claude/agents/tdd-red.md`)
- **Persona:** Strict QA Engineer
- **Constraint:** Can ONLY create/edit test files. Cannot touch source/implementation files.
