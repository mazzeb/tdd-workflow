#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-.}"

# Resolve to absolute path
TARGET="$(cd "$TARGET" && pwd)"

if [ "$TARGET" = "$SCRIPT_DIR" ]; then
  echo "Error: Target directory is the same as the source. Provide a different project path."
  exit 1
fi

if [ ! -d "$TARGET/.git" ]; then
  echo "Warning: $TARGET is not a git repository. Commits won't work in the TDD workflow."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

if [ -d "$TARGET/.claude/skills" ] || [ -d "$TARGET/.claude/agents" ]; then
  echo "Existing .claude/skills or .claude/agents found in target — files will be overwritten."
fi

echo "Installing TDD workflow skills and agents into: $TARGET"

# Copy skills and agents (exclude eval workspaces)
mkdir -p "$TARGET/.claude"
rsync -a --exclude='tdd-lifecycle-workspace' "$SCRIPT_DIR/.claude/skills" "$TARGET/.claude/"
rsync -a "$SCRIPT_DIR/.claude/agents" "$TARGET/.claude/"

echo ""
echo "Installed:"
echo "  .claude/skills/tdd-plan/"
echo "  .claude/skills/tdd-red/"
echo "  .claude/skills/tdd-green/"
echo "  .claude/skills/tdd-verify/"
echo "  .claude/skills/tdd-next-task/"
echo "  .claude/skills/tdd-show-tasks/"
echo "  .claude/skills/tdd-quick/"
echo "  .claude/agents/tdd-red/"
echo "  .claude/agents/tdd-green/"
echo "  .claude/agents/tdd-verify/"
echo ""
read -p "Commit installed files to git? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd "$TARGET"
  git add .claude/skills .claude/agents
  git commit -m "update/install tdd-workflow"
  echo "Committed."
fi

# Inject TDD workflow enforcement block into CLAUDE.md
TDD_BLOCK_MARKER="<!-- TDD-WORKFLOW-RULES -->"
CLAUDE_MD="$TARGET/CLAUDE.md"

inject_tdd_block() {
  cat <<'TDDEOF'

<!-- TDD-WORKFLOW-RULES -->
## TDD Workflow Rules

All implementation work in this project follows the TDD workflow. These rules apply to every conversation, whether or not a `/tdd-` command was explicitly invoked.

### Always plan before implementing
- When asked to implement, add, fix, or refactor something, use `/tdd-plan` (or `/tdd-quick` for small, single-behavior changes) to create task files first.
- Then use `/tdd-next-task` or `/tdd-all-tasks` to execute tasks through the Red → Green → Verify cycle.
- Never write implementation code without a corresponding task file in `_tasks/`.
- Never write tests and implementation code in the same step — they are separate phases (Red writes tests, Green writes implementation).

### Respect the planning phase
- When `/tdd-plan` is active and has asked the developer clarifying questions, **do not proceed until they answer**. Stay in the planning conversation.
- Never start implementing, writing tests, or creating task files while planning questions are still unanswered.
- Planning feels slow but prevents expensive rework downstream. Incomplete plans produce vague acceptance criteria, which produce wrong tests, which produce wrong code.

### Workflow commands
| Command | Purpose |
|---------|---------|
| `/tdd-plan` | Plan and create task files (start here) |
| `/tdd-quick` | Plan + implement a single small change |
| `/tdd-next-task` | Execute the next pending task |
| `/tdd-all-tasks` | Execute all remaining tasks |
| `/tdd-show-tasks` | Show task status dashboard |
<!-- /TDD-WORKFLOW-RULES -->
TDDEOF
}

if [ -f "$CLAUDE_MD" ]; then
  if grep -q "$TDD_BLOCK_MARKER" "$CLAUDE_MD"; then
    # Replace existing block
    # Use awk to remove old block and append new one
    awk "/$TDD_BLOCK_MARKER/{found=1} found && /<!-- \/TDD-WORKFLOW-RULES -->/{found=0; next} !found" "$CLAUDE_MD" > "$CLAUDE_MD.tmp"
    mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"
    inject_tdd_block >> "$CLAUDE_MD"
    echo "Updated TDD workflow rules in CLAUDE.md"
  else
    inject_tdd_block >> "$CLAUDE_MD"
    echo "Added TDD workflow rules to CLAUDE.md"
  fi
else
  inject_tdd_block > "$CLAUDE_MD"
  echo "Created CLAUDE.md with TDD workflow rules"
fi

echo ""
echo "Next steps:"
echo "  1. Add test commands and file conventions to your project's CLAUDE.md"
echo "  2. Run /tdd-plan to create your first stories"
