#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const DEST = process.cwd();

const SKILL_EXCLUDES = new Set(['tdd-lifecycle-workspace', 'tdd-plan-workspace']);

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function install() {
  const skillsSrc = path.join(PKG_ROOT, '.claude', 'skills');
  const agentsSrc = path.join(PKG_ROOT, '.claude', 'agents');
  const skillsDest = path.join(DEST, '.claude', 'skills');
  const agentsDest = path.join(DEST, '.claude', 'agents');

  // Warn if overwriting
  if (fs.existsSync(skillsDest) || fs.existsSync(agentsDest)) {
    console.warn('Existing .claude/skills or .claude/agents found — files will be overwritten.');
  }

  console.log('Installing TDD workflow skills and agents...\n');

  // Copy skills (excluding workspace dirs)
  for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKILL_EXCLUDES.has(entry.name)) continue;
    const src = path.join(skillsSrc, entry.name);
    const dest = path.join(skillsDest, entry.name);
    copyDirRecursive(src, dest);
    console.log(`  .claude/skills/${entry.name}/`);
  }

  // Copy agents
  for (const entry of fs.readdirSync(agentsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const src = path.join(agentsSrc, entry.name);
    const dest = path.join(agentsDest, entry.name);
    copyDirRecursive(src, dest);
    console.log(`  .claude/agents/${entry.name}/`);
  }

  console.log('\nDone!\n');
  console.log('Next steps:');
  console.log('  1. Run /tdd-setup-claude-md to add TDD workflow rules to your CLAUDE.md');
  console.log('  2. Add test commands and file conventions to your CLAUDE.md');
  console.log('  3. Run /tdd-plan to create your first stories');
}

function usage() {
  console.log(`Usage: tdd-workflow <command>

Commands:
  install    Copy TDD skills and agents into the current project's .claude/ directory

Examples:
  npx @mazzeb/tdd-workflow install
  cd my-project && npx @mazzeb/tdd-workflow install`);
}

const command = process.argv[2];

if (command === 'install') {
  install();
} else {
  usage();
  process.exit(command ? 1 : 0);
}
