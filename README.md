# TDD Workflow

Reusable test-driven development cycle for Claude Code projects, implemented as skills and subagents.

## Install

```bash
# From your project directory
/path/to/tdd-workflow/install.sh .

# Or specify a target project
./install.sh ~/projects/my-app
```

This copies the skills and agents into your project's `.claude/` directory. After copying, the script asks whether to commit the installed files to git. Then configure your `CLAUDE.md` with test commands and file conventions (see [Project Setup](#project-setup)).

## Cycle

1. **Plan** — Define features, break into stories with testable acceptance criteria
2. **Red** — Update the test suite to match the desired end state (write failing tests for new behavior, remove tests for removed behavior)
3. **Green** — Write minimum implementation to pass tests, remove dead code for removals
4. **Verify** — Review tests and implementation against the spec, confirm removals are complete

## Commands

| Command | Purpose |
|---------|---------|
| `/tdd-plan` | Discuss a feature, break it into stories, create task files |
| `/tdd-red [N]` | Write failing tests for a task |
| `/tdd-green [N]` | Write minimum implementation to pass tests |
| `/tdd-verify [N]` | Verify tests and implementation against acceptance criteria |
| `/tdd-next-task` | Run the full Red → Green → Verify cycle for the next eligible task |
| `/tdd-show-tasks` | Show a summary table of all tasks with status and progress |

All commands auto-select the next eligible task if no task number is provided.

## Task Files

Stories live in `_tasks/` as numbered markdown files:

```
_tasks/
├── 001-user-login.md
├── 002-session-management.md
└── 003-password-reset.md
```

Acceptance criteria use two formats:

```markdown
- [ ] Given [context], when [action], then [result]    # behavior AC → Red writes tests
- [ ] [REMOVE] The legacy /users-v1 endpoint           # removal AC → Red deletes tests
```

A single task can mix both formats (e.g., replacing a feature).

Each task file has frontmatter with status tracking:

```yaml
---
status: pending          # pending → in-progress → in-review → done
priority: medium
depends-on: []           # task numbers this depends on
---
```

## Agent Personas

Each phase is handled by a subagent with a distinct persona:

| Phase | Persona | Mindset |
|-------|---------|---------|
| Plan | Product Strategist + Tech Architect | User value + technical design |
| Red | Strict QA Engineer | Tests from the user's perspective, ACs as contract — writes and removes tests |
| Green | Pragmatic Developer | Simplest thing that works, no over-engineering |
| Verify | Senior Code Reviewer | Reviews against spec, checks completeness + scope |

## Feedback Loop

When Verify rejects, it writes specific feedback to the task file's `## Feedback` section. Red/Green agents read this feedback on retry and address every point. The feedback section is cleared when the task reaches `done`.

## Project Setup

Configure your project's `CLAUDE.md` with:
- Test commands (e.g., `npm test`, `pytest`)
- File conventions (e.g., test files in `__tests__/`, `*.test.ts`)
- Language/framework context

## File Structure

```
.claude/
├── skills/
│   ├── tdd-plan/
│   │   ├── SKILL.md          # Plan skill
│   │   └── template.md       # Task file template
│   ├── tdd-red/
│   │   └── SKILL.md          # Red skill (delegates to subagent)
│   ├── tdd-green/
│   │   └── SKILL.md          # Green skill (delegates to subagent)
│   ├── tdd-verify/
│   │   └── SKILL.md          # Verify skill (delegates to subagent)
│   ├── tdd-next-task/
│   │   └── SKILL.md          # Orchestrator skill
│   └── tdd-show-tasks/
│       └── SKILL.md          # Task summary/dashboard skill
└── agents/
    ├── tdd-red/
    │   └── tdd-red.md        # QA Engineer subagent
    ├── tdd-green/
    │   └── tdd-green.md      # Pragmatic Developer subagent
    └── tdd-verify/
        └── tdd-verify.md     # Code Reviewer subagent
```
