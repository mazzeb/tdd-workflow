# TDD Workflow — Development Guide

This repo contains reusable TDD skills and subagents for Claude Code. It is **not** a runnable project — it gets installed into other projects via `install.sh`.

## Project Structure

```
install.sh                          # Copies skills/agents into target project
.claude/skills/tdd-*/SKILL.md       # Slash-command definitions
.claude/skills/tdd-plan/template.md # Task file template
.claude/agents/tdd-*/tdd-*.md       # Subagent personas
```

## Conventions

### Skills (SKILL.md)
- Title: `# /command-name — Emoji Short Description`
- Sections: Persona (if self-contained), Usage, Instructions, Subagent (if delegating), Constraints, Tools Available, Error Handling
- Delegator skills launch agents with prompts separated by `---`
- All commands use `/tdd-` prefix, lowercase hyphenated

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
- `pending` → `in-progress` (Red writes/removes tests) → `in-review` (Green completes implementation) → `done` (Verify approves)
- Verify rejection can revert to `pending` (Red issues) or `in-progress` (Green issues)

## Development Rules

- Do not add features or commands that break the install-into-target-project model
- Keep skills and agents self-contained — they must work without this repo being present
- Agent personas must stay focused: Red doesn't implement, Green doesn't write new tests, Verify doesn't modify code
- `[REMOVE]` ACs drive test deletion (Red) and code deletion (Green) — Verify confirms absence via Grep
- Test the install script against a scratch directory before changing copy logic
- The README.md documents the user-facing interface — keep it in sync with any command or workflow changes
