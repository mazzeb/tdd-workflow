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

echo ""
echo "Next steps:"
echo "  1. Add test commands and file conventions to your project's CLAUDE.md"
echo "  2. Run /tdd-plan to create your first stories"
