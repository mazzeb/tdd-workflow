# TDD Workflow — Development Guide

This repo contains reusable TDD skills and subagents for Claude Code. It is **not** a runnable project — it gets installed into other projects via `install.sh`.

## Project Structure

```
install.sh                          # Copies skills/agents into target project
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
- Frontmatter: `status` (pending/in-progress/in-review/done), `priority`, `depends-on`
- AC formats: `Given/when/then` for behavior, `[REMOVE]` prefix for removal — both with checkboxes
- Feedback section: added on Verify rejection, cleared on done

### Status Flow
- `pending` → Red writes tests → `in-progress` → Green implements → `in-review` → Verify reviews → `done`
- Verify rejection can revert to `pending` (Red issues) or `in-progress` (Green issues)

## Development Rules

- Do not add features or commands that break the install-into-target-project model
- Keep skills and agents self-contained — they must work without this repo being present
- Agent personas must stay focused: Red doesn't implement, Green doesn't write new tests, Verify doesn't modify code
- `[REMOVE]` ACs drive test deletion (Red) and code deletion (Green) — Verify confirms absence via Grep
- Test the install script against a scratch directory before changing copy logic
- The README.md documents the user-facing interface — keep it in sync with any command or workflow changes
