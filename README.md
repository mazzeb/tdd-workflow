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

Each task has a `type` that determines which phases run:

| Type | Workflow | Use for |
|------|----------|---------|
| `feature` | Red → Green → Verify | New behavior that needs tests first |
| `bugfix` | Red → Green → Verify | Bugs reproduced with a failing test |
| `refactor` | Green → Verify | Restructuring code while existing tests stay green |
| `test` | Red → Verify | Adding or improving test coverage only |
| `chore` | Green → Verify | Config, deps, CI, docs |

**Phases:**
1. **Plan** — Define features, break into stories with testable acceptance criteria
2. **Red** — Update the test suite to match the desired end state (write failing tests for new behavior, remove tests for removed behavior)
3. **Green** — Write minimum implementation to pass tests, remove dead code for removals
4. **Verify** — Review tests and implementation against the spec, confirm removals are complete

Verify always runs. On rejection, the task loops back to the appropriate phase until it passes (max 3 retries).

## Commands

| Command | Purpose |
|---------|---------|
| `/tdd-plan` | Discuss a feature, break it into stories, create task files |
| `/tdd-red [N]` | Write failing tests for a task |
| `/tdd-green [N]` | Write minimum implementation to pass tests |
| `/tdd-verify [N]` | Verify tests and implementation against acceptance criteria |
| `/tdd-next-task` | Run the appropriate workflow for the next eligible task |
| `/tdd-all-tasks` | Run all remaining tasks sequentially |
| `/tdd-quick <description>` | Plan a single task and immediately run its workflow |
| `/tdd-show-tasks` | Show a summary table of all tasks with status and progress |
| `/tdd-archive` | Move completed tasks to `_tasks/_archive/` |

All commands auto-select the next eligible task if no task number is provided. `/tdd-quick` is a shortcut for small changes — it creates one task file and runs the full cycle in a single invocation. For larger features, use `/tdd-plan` to break the work into multiple stories first.

## Task Files

Stories live in `_tasks/` as numbered markdown files:

```
_tasks/
├── 001-user-login.md          # active tasks
├── 002-session-management.md
├── 003-password-reset.md
└── _archive/                  # completed tasks (moved by /tdd-archive)
    ├── ...
```

Completed tasks can be moved to `_tasks/_archive/` with `/tdd-archive` to keep the active list lean. Archived tasks are still tracked for dependency resolution — being in the archive directory signals `done` status without needing to read the file.

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
type: feature            # feature | bugfix | refactor | test | chore
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
│   ├── tdd-all-tasks/
│   │   └── SKILL.md          # Run-all orchestrator skill
│   ├── tdd-quick/
│   │   └── SKILL.md          # Quick single-task orchestrator skill
│   ├── tdd-show-tasks/
│   │   └── SKILL.md          # Task summary/dashboard skill
│   └── tdd-archive/
│       └── SKILL.md          # Archive completed tasks skill
└── agents/
    ├── tdd-red/
    │   └── tdd-red.md        # QA Engineer subagent
    ├── tdd-green/
    │   └── tdd-green.md      # Pragmatic Developer subagent
    └── tdd-verify/
        └── tdd-verify.md     # Code Reviewer subagent
```
