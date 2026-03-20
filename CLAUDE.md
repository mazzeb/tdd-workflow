# TDD Workflow — Development Guide

This repo contains reusable TDD skills and subagents for Claude Code. It is **not** a runnable project — it gets installed into other projects via `install.sh`.

## Project Structure

```
install.sh                          # Copies skills/agents into target project + injects CLAUDE.md rules
README.md                           # User-facing documentation
.claude/
  skills/
    tdd-plan/SKILL.md               # /tdd-plan — self-contained (has own persona)
    tdd-plan/template.md            # Task file frontmatter + section template
    tdd-red/SKILL.md                # /tdd-red — delegator → tdd-red agent
    tdd-green/SKILL.md              # /tdd-green — delegator → tdd-green agent
    tdd-verify/SKILL.md             # /tdd-verify — delegator → tdd-verify agent
    tdd-next-task/SKILL.md          # /tdd-next-task — orchestrator (Red→Green→Verify loop)
    tdd-all-tasks/SKILL.md          # /tdd-all-tasks — runs all remaining tasks
    tdd-quick/SKILL.md              # /tdd-quick — plan + Red→Green→Verify for one small change
    tdd-show-tasks/SKILL.md         # /tdd-show-tasks — read-only dashboard
    tdd-archive/SKILL.md            # /tdd-archive — move done tasks to archive
  agents/
    tdd-red/tdd-red.md              # Strict QA Engineer persona
    tdd-green/tdd-green.md          # Pragmatic Developer persona
    tdd-verify/tdd-verify.md        # Senior Code Reviewer persona
```

## Commands

```bash
# Install into a target project
./install.sh /path/to/target

# Test install against a scratch directory
mkdir /tmp/tdd-test && ./install.sh /tmp/tdd-test && ls -R /tmp/tdd-test/.claude
```

## Conventions

### Skills (SKILL.md)
- Title: `# /command-name — Emoji Short Description`
- Sections: Persona (if self-contained), Usage, Instructions, Subagent (if delegating), Constraints, Tools Available, Error Handling
- Delegator skills launch agents with prompts separated by `---`
- All commands use `/tdd-` prefix, lowercase hyphenated
- Three skill types:
  - **Self-contained** (`tdd-plan`, `tdd-show-tasks`) — has own Persona, runs directly
  - **Delegator** (`tdd-red`, `tdd-green`, `tdd-verify`) — launches a subagent, prompt above `---` is for the skill, below `---` is the agent prompt
  - **Orchestrator** (`tdd-next-task`, `tdd-all-tasks`, `tdd-quick`) — coordinates multiple skill/agent invocations in sequence

### Agents (tdd-*.md)
- Title: `# TDD Phase Agent — Persona Name`
- Sections: Persona, Task, Process (numbered steps), Constraints, Tools Available
- Strict tool segregation: Red = test files only, Green = source files only, Verify = read-only review
- Each agent has a distinct persona and mindset

### Task Files (_tasks/)
- Naming: `NNN-slug-description.md` (three-digit zero-padded)
- Frontmatter: `status` (pending/in-progress/in-review/done), `type` (feature/bugfix/refactor/test/chore), `priority`, `depends-on`
- AC formats: `Given/when/then` for behavior, `[REMOVE]` prefix for removal — both with checkboxes
- Feedback section: added on Verify rejection, cleared on done
- **Archive**: `_tasks/_archive/` holds completed tasks moved by `/tdd-archive`. Being in the archive directory signals `done` status — skills check archived filenames for dependency resolution without reading file contents. New task numbering checks both directories to avoid conflicts.

### Task Types & Workflows
- `feature` / `bugfix`: Red → Green → Verify (full TDD cycle)
- `refactor` / `chore`: Green → Verify (no new tests — existing tests guard correctness)
- `test`: Red → Verify (test coverage only — no source changes)
- Default type is `feature` when `type` field is missing (backward compatible)
- Orchestrators bridge status gaps when phases are skipped (e.g., set `in-progress` before Green when Red was skipped)

### Status Flow
- **Valid status values**: `pending`, `in-progress`, `in-review`, `done` — these are the ONLY allowed values. Never use phase names (red/green/verify) as status values.
- Full cycle: `pending` → Red → `in-progress` → Green → `in-review` → Verify → `done`
- Without Red: `pending` → (orchestrator bridges to `in-progress`) → Green → `in-review` → Verify → `done`
- Without Green: `pending` → Red → `in-progress` → (orchestrator bridges to `in-review`) → Verify → `done`
- Verify rejection routes back to the appropriate phase for the task type
- **Orchestrator validation**: After each phase, orchestrators must read the task file and verify the status is a valid value. If an agent set an invalid status, the orchestrator fixes it before proceeding.

## Development Rules

- Do not add features or commands that break the install-into-target-project model
- Keep skills and agents self-contained — they must work without this repo being present
- Agent personas must stay focused: Red doesn't implement, Green doesn't write new tests, Verify doesn't modify code
- `[REMOVE]` ACs drive test deletion (Red) and code deletion (Green) — Verify confirms absence via Grep
- Test the install script against a scratch directory before changing copy logic
- The README.md documents the user-facing interface — keep it in sync with any command or workflow changes
