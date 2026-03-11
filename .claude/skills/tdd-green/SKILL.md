# /tdd-green — 🟢 Write Minimum Implementation

Delegates to the `tdd-green` subagent (Pragmatic Developer persona).

## Usage

```
/tdd-green          # Auto-picks current in-progress task
/tdd-green 3        # Write implementation for task 003
```

## Instructions

When the user invokes `/tdd-green`, delegate the work to the `tdd-green` subagent:

1. Parse the optional task number argument from `$ARGUMENTS`
2. Use the **Agent tool** with `agent_path=".claude/agents/tdd-green/tdd-green.md"` and the following prompt:

**If task number provided:**
> Read the task file for task $TASK_NUMBER in the `_tasks/` directory. Write the minimum implementation to make all failing tests pass. Follow your complete process.

**If no task number:**
> Auto-select the current in-progress task from `_tasks/`. Write the minimum implementation to make all failing tests pass. Follow your complete process.

3. Report the subagent's results back to the user:
   - Which task was worked on
   - What source files were created/modified
   - Confirmation that tests pass (🟢 Green phase complete)
   - Any issues encountered (e.g., tests that couldn't be made to pass)
   - The **Changed Files** list from the agent's output — preserve this exactly, as orchestrators depend on it for scoped commits

## Subagent

- **Agent:** `tdd-green` (`.claude/agents/tdd-green/tdd-green.md`)
- **Persona:** Pragmatic Developer
