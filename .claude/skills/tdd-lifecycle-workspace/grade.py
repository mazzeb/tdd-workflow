#!/usr/bin/env python3
"""Grade tdd-lifecycle eval outputs against assertions.

Each eval has three phases (red, green, verify). Each phase is graded by
comparing the project snapshot after that phase against the expected state.

Directory structure expected:
  iteration-N/
    {eval_name}/
      {config}/              # with_skill or without_skill
        post-red/            # project snapshot after Red phase
        post-green/          # project snapshot after Green phase
        post-verify/         # project snapshot after Verify phase
        grading.json         # output from this script
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path(__file__).parent
ITERATION = sys.argv[1] if len(sys.argv) > 1 else "iteration-1"
ITER_DIR = WORKSPACE / ITERATION

EVAL_NAMES = ["tag-model-schema", "jwt-auth-replace"]
CONFIGS = ["with_skill", "without_skill"]

# --- Helpers ---

def read_file(path):
    """Read file contents or return None if missing."""
    try:
        return Path(path).read_text()
    except (FileNotFoundError, IsADirectoryError):
        return None


def find_files(directory, pattern="*"):
    """Find files matching glob pattern in directory."""
    d = Path(directory)
    if not d.exists():
        return []
    return sorted(d.rglob(pattern))


def find_task_file(snapshot_dir):
    """Find the single task file in _tasks/."""
    tasks_dir = Path(snapshot_dir) / "_tasks"
    if not tasks_dir.exists():
        return None, None
    task_files = list(tasks_dir.glob("*.md"))
    if not task_files:
        return None, None
    path = task_files[0]
    return str(path), path.read_text()


def get_test_files(snapshot_dir):
    """Get all test files in the snapshot."""
    tests_dir = Path(snapshot_dir) / "tests"
    if not tests_dir.exists():
        return []
    return sorted(tests_dir.rglob("*.test.js"))


def get_source_files(snapshot_dir):
    """Get all source files (non-test) in src/."""
    src_dir = Path(snapshot_dir) / "src"
    if not src_dir.exists():
        return []
    return sorted(src_dir.rglob("*.js"))


def files_changed(dir_a, dir_b, subdir):
    """Check if files in subdir changed between two snapshots."""
    a = Path(dir_a) / subdir
    b = Path(dir_b) / subdir
    if not a.exists() and not b.exists():
        return False, "Neither directory exists"
    if not a.exists() or not b.exists():
        return True, f"Directory {'added' if b.exists() else 'removed'}"

    a_files = {f.relative_to(a): f.read_text() for f in a.rglob("*.js")}
    b_files = {f.relative_to(b): f.read_text() for f in b.rglob("*.js")}

    added = set(b_files) - set(a_files)
    removed = set(a_files) - set(b_files)
    modified = {f for f in (set(a_files) & set(b_files)) if a_files[f] != b_files[f]}

    if not added and not removed and not modified:
        return False, "No changes"
    parts = []
    if added:
        parts.append(f"added: {[str(f) for f in added]}")
    if removed:
        parts.append(f"removed: {[str(f) for f in removed]}")
    if modified:
        parts.append(f"modified: {[str(f) for f in modified]}")
    return True, "; ".join(parts)


def run_npm_test(snapshot_dir):
    """Run npm test in the snapshot directory and return (exit_code, output)."""
    try:
        result = subprocess.run(
            ["npm", "test", "--", "--forceExit"],
            cwd=str(snapshot_dir),
            capture_output=True,
            text=True,
            timeout=60,
            env={**os.environ, "NODE_ENV": "test"},
        )
        return result.returncode, result.stdout + result.stderr
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return -1, str(e)


def count_test_failures(test_output):
    """Parse Jest output for failure count."""
    # Look for "Tests: N failed, M passed, P total"
    m = re.search(r"Tests:\s+(\d+)\s+failed", test_output)
    if m:
        return int(m.group(1))
    # Also look for "Test Suites: N failed"
    m = re.search(r"Test Suites:\s+(\d+)\s+failed", test_output)
    if m:
        return int(m.group(1))
    return 0


def has_syntax_errors(test_output):
    """Check if test failures are from syntax/import errors, not assertions.

    Note: 'Cannot find module' for a not-yet-created source file (e.g., '../src/models/Tag')
    is a VALID Red failure — the module doesn't exist because Green hasn't created it yet.
    We only flag it if it's for a test dependency (like jest, supertest, etc.) or a syntax error
    in the test code itself.
    """
    # True syntax/import errors in test code itself
    hard_errors = [
        "SyntaxError",
        "Unexpected token",
    ]
    if any(indicator in test_output for indicator in hard_errors):
        return True

    # "Cannot find module" is only a problem if it's for a test dependency, not a source module
    # Source module not found = expected Red behavior (Green will create it)
    if "Cannot find module" in test_output:
        # Check if it's a test infra import (jest, supertest, etc.) vs a source import
        missing_module_lines = re.findall(r"Cannot find module '([^']+)'", test_output)
        for mod in missing_module_lines:
            # Test infra modules that should exist
            if mod in ("jest", "supertest", "better-sqlite3", "@jest/globals"):
                return True
            # Source modules that don't exist yet are EXPECTED in Red phase
            if mod.startswith("../src/") or mod.startswith("./src/"):
                continue
            # node_modules that should be installed
            if not mod.startswith(".") and not mod.startswith("/"):
                return True
        return False

    # Other indicators
    soft_errors = [
        "is not a function",
        "is not defined",
        "Module not found",
    ]
    return any(indicator in test_output for indicator in soft_errors)


def get_ac_lines(task_content):
    """Extract AC lines from task file content."""
    if not task_content:
        return [], []
    lines = task_content.split("\n")
    regular_acs = []
    remove_acs = []
    in_ac_section = False
    for line in lines:
        if "## Acceptance Criteria" in line:
            in_ac_section = True
            continue
        if in_ac_section and line.startswith("## "):
            break
        if in_ac_section and re.match(r"- \[[ x]\]", line):
            if "[REMOVE]" in line:
                remove_acs.append(line)
            else:
                regular_acs.append(line)
    return regular_acs, remove_acs


# --- Red Phase Assertions ---

def check_R1_ac_coverage(snapshot_dir, task_content, eval_name):
    """R1: Every AC has at least one corresponding test."""
    regular_acs, remove_acs = get_ac_lines(task_content)
    test_files = get_test_files(snapshot_dir)
    if not test_files:
        return False, "No test files found"

    all_test_content = ""
    for tf in test_files:
        all_test_content += tf.read_text() + "\n"

    # Check that test file has describe/test blocks roughly matching AC count
    test_blocks = re.findall(r"(test|it)\s*\(", all_test_content)
    # For regular ACs, we need at least one test per AC
    if len(test_blocks) < len(regular_acs):
        return False, f"Found {len(test_blocks)} tests but {len(regular_acs)} regular ACs"

    return True, f"Found {len(test_blocks)} tests for {len(regular_acs)} regular ACs"


def check_R2_tests_fail(snapshot_dir, eval_name):
    """R2: New tests fail (npm test shows failures)."""
    exit_code, output = run_npm_test(snapshot_dir)
    if exit_code != 0:
        failures = count_test_failures(output)
        return True, f"Tests fail as expected (exit code {exit_code}, {failures} failures)"
    return False, "Tests pass — Red phase should have failing tests"


def check_R3_right_reason(snapshot_dir, eval_name):
    """R3: Tests fail for right reason (assertion failures, not syntax/import errors)."""
    exit_code, output = run_npm_test(snapshot_dir)
    if exit_code == 0:
        return False, "Tests pass — cannot check failure reason"
    if has_syntax_errors(output):
        # Extract the specific error
        for indicator in ["SyntaxError", "Cannot find module", "is not a function",
                         "is not defined", "Unexpected token", "Module not found"]:
            if indicator in output:
                return False, f"Tests fail for wrong reason: {indicator} found in output"
    return True, "Tests fail with assertion errors (correct Red behavior)"


def check_R4_conventions(snapshot_dir, eval_name):
    """R4: Test files follow project conventions (Jest, supertest, in-memory DB)."""
    test_files = get_test_files(snapshot_dir)
    if not test_files:
        return False, "No test files found"

    issues = []
    for tf in test_files:
        if tf.name == "bookmarks.test.js":
            continue  # Skip pre-existing test file
        content = tf.read_text()
        if "describe(" not in content and "test(" not in content:
            issues.append(f"{tf.name}: missing describe/test blocks")
        # Only require DB mock for tests that interact with the database
        # Middleware unit tests (auth.test.js) test req/res directly and don't need DB
        needs_db = any(kw in content for kw in ["getDb", "database", "models/"])
        if needs_db and "jest.mock" not in content and ":memory:" not in content:
            issues.append(f"{tf.name}: uses DB but no in-memory DB mock")

    if issues:
        return False, f"Convention issues: {issues}"
    return True, f"All {len(test_files)} test files follow Jest conventions"


def check_R5_status_in_progress(snapshot_dir, eval_name):
    """R5: Task status updated to in-progress."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"
    if "status: in-progress" in task_content:
        return True, "Status correctly set to in-progress"
    m = re.search(r"status:\s*(\S+)", task_content)
    actual = m.group(1) if m else "unknown"
    return False, f"Status is '{actual}', expected 'in-progress'"


def check_R6_no_source_changes(clean_dir, snapshot_dir, eval_name):
    """R6: No source files modified (only test files)."""
    changed, details = files_changed(clean_dir, snapshot_dir, "src")
    if changed:
        return False, f"Source files were modified: {details}"
    changed_config, config_details = files_changed(clean_dir, snapshot_dir, "config")
    if changed_config:
        return False, f"Config files were modified: {config_details}"
    return True, "No source or config files modified"


def check_R7_existing_tests_pass(snapshot_dir, eval_name):
    """R7: Pre-existing tests still pass.

    Exception: When [REMOVE] ACs modify existing test files (e.g., replacing base64
    tokens with JWT in bookmarks.test.js), those tests are EXPECTED to fail because
    the source code hasn't been updated yet. In that case, R7 passes if the failures
    are caused by the [REMOVE] AC change, not by unrelated breakage.
    """
    bookmarks_test = Path(snapshot_dir) / "tests" / "bookmarks.test.js"
    if not bookmarks_test.exists():
        return False, "bookmarks.test.js not found"

    # For jwt-auth-replace: the [REMOVE] AC changes bookmarks.test.js to use JWT tokens,
    # so existing tests WILL fail since auth.js still uses base64. This is expected.
    if eval_name == "jwt-auth-replace":
        content = bookmarks_test.read_text()
        if "jwt.sign" in content or "jsonwebtoken" in content:
            return True, "bookmarks.test.js modified by [REMOVE] AC (JWT tokens) — failures expected until Green phase"

    try:
        result = subprocess.run(
            ["npx", "jest", "tests/bookmarks.test.js", "--forceExit"],
            cwd=str(snapshot_dir),
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, "NODE_ENV": "test"},
        )
        if result.returncode == 0:
            return True, "Pre-existing bookmarks.test.js passes"
        return False, f"bookmarks.test.js fails: {result.stderr[-200:]}"
    except Exception as e:
        return False, f"Error running bookmarks.test.js: {e}"


def check_R8_remove_tests_deleted(clean_dir, snapshot_dir, eval_name):
    """R8: [REMOVE] ACs handled — existing tests for removed behavior deleted."""
    if eval_name != "jwt-auth-replace":
        return True, "N/A — no [REMOVE] ACs in this eval"

    # Check that base64 token creation is removed from tests
    bookmarks_test = Path(snapshot_dir) / "tests" / "bookmarks.test.js"
    if not bookmarks_test.exists():
        return False, "bookmarks.test.js not found"
    content = bookmarks_test.read_text()

    # The [REMOVE] AC says: Base64 token creation in tests should be replaced with JWT
    if "Buffer.from" in content and "base64" in content:
        return False, "Base64 token creation still present in bookmarks.test.js"
    return True, "Base64 token creation removed from test files"


# --- Green Phase Assertions ---

def check_G1_tests_pass(snapshot_dir, eval_name):
    """G1: All tests pass (npm test exit code 0)."""
    exit_code, output = run_npm_test(snapshot_dir)
    if exit_code == 0:
        return True, "All tests pass"
    failures = count_test_failures(output)
    return False, f"Tests fail (exit code {exit_code}, {failures} failures)"


def check_G2_follows_patterns(snapshot_dir, eval_name):
    """G2: Implementation follows project patterns (static class methods, Express router)."""
    if eval_name == "tag-model-schema":
        tag_model = Path(snapshot_dir) / "src" / "models" / "Tag.js"
        if not tag_model.exists():
            return False, "src/models/Tag.js not found"
        content = tag_model.read_text()
        if "class Tag" not in content and "class tag" not in content.lower():
            return False, "Tag.js doesn't use class pattern"
        if "static" not in content:
            return False, "Tag.js doesn't use static methods"
        return True, "Tag model follows class + static method pattern"
    elif eval_name == "jwt-auth-replace":
        auth = Path(snapshot_dir) / "src" / "middleware" / "auth.js"
        if not auth.exists():
            return False, "src/middleware/auth.js not found"
        content = auth.read_text()
        if "jsonwebtoken" not in content and "jwt" not in content.lower():
            return False, "auth.js doesn't use JWT"
        return True, "Auth middleware uses JWT verification"
    return True, "N/A"


def check_G3_no_test_assertions_changed(post_red_dir, post_green_dir, eval_name):
    """G3: No test assertions changed."""
    # Compare test files between post-red and post-green
    red_tests = Path(post_red_dir) / "tests"
    green_tests = Path(post_green_dir) / "tests"

    if not red_tests.exists() or not green_tests.exists():
        return False, "Test directories not found"

    red_files = {f.relative_to(red_tests): f.read_text() for f in red_tests.rglob("*.test.js")}
    green_files = {f.relative_to(green_tests): f.read_text() for f in green_tests.rglob("*.test.js")}

    # Check for assertion changes (expect(), toBe, toEqual, etc.)
    issues = []
    for fname in red_files:
        if fname not in green_files:
            issues.append(f"{fname} was deleted")
            continue
        red_content = red_files[fname]
        green_content = green_files[fname]
        if red_content != green_content:
            # Check if only imports/setup changed (allowed) vs assertions changed (not allowed)
            red_expects = re.findall(r"expect\(.+?\)\..+?;", red_content, re.DOTALL)
            green_expects = re.findall(r"expect\(.+?\)\..+?;", green_content, re.DOTALL)
            if red_expects != green_expects:
                issues.append(f"{fname}: test assertions were modified")

    if issues:
        return False, f"Test changes detected: {issues}"
    return True, "No test assertions changed by Green phase"


def check_G4_status_in_review(snapshot_dir, eval_name):
    """G4: Task status updated to in-review."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"
    if "status: in-review" in task_content:
        return True, "Status correctly set to in-review"
    m = re.search(r"status:\s*(\S+)", task_content)
    actual = m.group(1) if m else "unknown"
    return False, f"Status is '{actual}', expected 'in-review'"


def check_G5_minimal_code(snapshot_dir, eval_name):
    """G5: Minimal code (no over-engineering)."""
    src_files = get_source_files(snapshot_dir)
    issues = []
    for sf in src_files:
        content = sf.read_text()
        # Check for common over-engineering signals
        if content.count("class ") > 3:
            issues.append(f"{sf.name}: multiple classes may indicate over-engineering")
        # Check file size (>200 lines for a single feature is suspicious)
        lines = content.split("\n")
        if len(lines) > 200:
            issues.append(f"{sf.name}: {len(lines)} lines (potentially over-engineered)")

    if issues:
        return False, f"Potential over-engineering: {issues}"
    return True, "Code appears minimal and focused"


def check_G6_file_locations(snapshot_dir, eval_name):
    """G6: Files in correct locations (src/models/, src/routes/)."""
    if eval_name == "tag-model-schema":
        tag_model = Path(snapshot_dir) / "src" / "models" / "Tag.js"
        if not tag_model.exists():
            return False, "Expected src/models/Tag.js not found"
        return True, "Tag.js in correct location: src/models/"
    elif eval_name == "jwt-auth-replace":
        auth = Path(snapshot_dir) / "src" / "middleware" / "auth.js"
        if not auth.exists():
            return False, "Expected src/middleware/auth.js not found"
        return True, "auth.js in correct location: src/middleware/"
    return True, "N/A"


def check_G7_remove_code_deleted(snapshot_dir, eval_name):
    """G7: [REMOVE] ACs handled — specified code deleted."""
    if eval_name != "jwt-auth-replace":
        return True, "N/A — no [REMOVE] ACs in this eval"

    auth = Path(snapshot_dir) / "src" / "middleware" / "auth.js"
    if not auth.exists():
        return False, "src/middleware/auth.js not found"
    content = auth.read_text()

    if "Buffer.from" in content and "base64" in content:
        return False, "Base64 decoding logic still present in auth.js"
    if "jsonwebtoken" not in content and "jwt" not in content.lower():
        return False, "JWT verification not implemented in auth.js"
    return True, "Base64 auth removed and replaced with JWT"


def check_G8_dependencies(snapshot_dir, eval_name):
    """G8: New dependencies added if needed."""
    if eval_name != "jwt-auth-replace":
        return True, "N/A — no new dependencies expected"

    pkg = Path(snapshot_dir) / "package.json"
    if not pkg.exists():
        return False, "package.json not found"
    content = pkg.read_text()
    if "jsonwebtoken" in content:
        return True, "jsonwebtoken dependency added to package.json"
    return False, "jsonwebtoken not found in package.json dependencies"


# --- Verify Phase Assertions ---

def check_V1_tests_pass(snapshot_dir, eval_name):
    """V1: Tests still pass after Verify runs."""
    exit_code, output = run_npm_test(snapshot_dir)
    if exit_code == 0:
        return True, "All tests still pass after Verify"
    return False, f"Tests fail after Verify (exit code {exit_code})"


def check_V2_no_code_changes(post_green_dir, post_verify_dir, eval_name):
    """V2: No test or source files modified (only task file)."""
    src_changed, src_details = files_changed(post_green_dir, post_verify_dir, "src")
    test_changed, test_details = files_changed(post_green_dir, post_verify_dir, "tests")

    issues = []
    if src_changed:
        issues.append(f"Source files changed: {src_details}")
    if test_changed:
        issues.append(f"Test files changed: {test_details}")

    if issues:
        return False, "; ".join(issues)
    return True, "Only task file modified by Verify"


def check_V3_status_done(snapshot_dir, eval_name):
    """V3: Status set to done."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"
    if "status: done" in task_content:
        return True, "Status correctly set to done"
    m = re.search(r"status:\s*(\S+)", task_content)
    actual = m.group(1) if m else "unknown"
    return False, f"Status is '{actual}', expected 'done'"


def check_V4_checkboxes_checked(snapshot_dir, eval_name):
    """V4: All AC checkboxes checked (- [x])."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"

    unchecked = re.findall(r"- \[ \]", task_content)
    checked = re.findall(r"- \[x\]", task_content)

    if unchecked:
        return False, f"{len(unchecked)} unchecked ACs remain (found {len(checked)} checked)"
    if checked:
        return True, f"All {len(checked)} ACs checked off"
    return False, "No AC checkboxes found"


def check_V5_no_feedback(snapshot_dir, eval_name):
    """V5: Feedback section removed/absent (approval path)."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"
    if "## Feedback" in task_content:
        return False, "Feedback section still present (should be removed on approval)"
    return True, "No Feedback section present (clean approval)"


def check_V6_verdict_explanation(snapshot_dir, eval_name):
    """V6: Verdict explanation present in task file or agent output."""
    _, task_content = find_task_file(snapshot_dir)
    if not task_content:
        return False, "Task file not found"

    # Check for status: done as implicit verdict
    if "status: done" in task_content:
        # Also check that checkboxes are checked as verdict evidence
        checked = re.findall(r"- \[x\]", task_content)
        if checked:
            return True, f"Verdict: approved — {len(checked)} ACs verified and checked"
    # Check for feedback (rejection verdict)
    if "## Feedback" in task_content:
        return True, "Verdict: rejected — feedback section present"
    return False, "No clear verdict found (no done status and no feedback)"


# --- Grading orchestration ---

def grade_red(eval_name, config, clean_dir):
    """Grade Red phase for an eval."""
    snapshot = ITER_DIR / eval_name / config / "post-red"
    if not snapshot.exists():
        return None, "post-red snapshot not found"

    _, task_content = find_task_file(clean_dir)
    results = []

    checks = [
        ("R1: AC coverage", lambda: check_R1_ac_coverage(snapshot, task_content, eval_name)),
        ("R2: Tests fail", lambda: check_R2_tests_fail(snapshot, eval_name)),
        ("R3: Right failure reason", lambda: check_R3_right_reason(snapshot, eval_name)),
        ("R4: Follows conventions", lambda: check_R4_conventions(snapshot, eval_name)),
        ("R5: Status in-progress", lambda: check_R5_status_in_progress(snapshot, eval_name)),
        ("R6: No source changes", lambda: check_R6_no_source_changes(clean_dir, snapshot, eval_name)),
        ("R7: Existing tests pass", lambda: check_R7_existing_tests_pass(snapshot, eval_name)),
        ("R8: [REMOVE] tests deleted", lambda: check_R8_remove_tests_deleted(clean_dir, snapshot, eval_name)),
    ]

    for name, check_fn in checks:
        try:
            passed, evidence = check_fn()
        except Exception as e:
            passed, evidence = False, f"Error: {e}"
        results.append({"assertion": name, "passed": passed, "evidence": evidence})

    return results, None


def grade_green(eval_name, config):
    """Grade Green phase for an eval."""
    post_red = ITER_DIR / eval_name / config / "post-red"
    post_green = ITER_DIR / eval_name / config / "post-green"
    if not post_green.exists():
        return None, "post-green snapshot not found"

    results = []
    checks = [
        ("G1: Tests pass", lambda: check_G1_tests_pass(post_green, eval_name)),
        ("G2: Follows patterns", lambda: check_G2_follows_patterns(post_green, eval_name)),
        ("G3: No test assertions changed", lambda: check_G3_no_test_assertions_changed(post_red, post_green, eval_name)),
        ("G4: Status in-review", lambda: check_G4_status_in_review(post_green, eval_name)),
        ("G5: Minimal code", lambda: check_G5_minimal_code(post_green, eval_name)),
        ("G6: Correct file locations", lambda: check_G6_file_locations(post_green, eval_name)),
        ("G7: [REMOVE] code deleted", lambda: check_G7_remove_code_deleted(post_green, eval_name)),
        ("G8: Dependencies added", lambda: check_G8_dependencies(post_green, eval_name)),
    ]

    for name, check_fn in checks:
        try:
            passed, evidence = check_fn()
        except Exception as e:
            passed, evidence = False, f"Error: {e}"
        results.append({"assertion": name, "passed": passed, "evidence": evidence})

    return results, None


def grade_verify(eval_name, config):
    """Grade Verify phase for an eval."""
    post_green = ITER_DIR / eval_name / config / "post-green"
    post_verify = ITER_DIR / eval_name / config / "post-verify"
    if not post_verify.exists():
        return None, "post-verify snapshot not found"

    results = []
    checks = [
        ("V1: Tests pass", lambda: check_V1_tests_pass(post_verify, eval_name)),
        ("V2: No code changes", lambda: check_V2_no_code_changes(post_green, post_verify, eval_name)),
        ("V3: Status done", lambda: check_V3_status_done(post_verify, eval_name)),
        ("V4: Checkboxes checked", lambda: check_V4_checkboxes_checked(post_verify, eval_name)),
        ("V5: No feedback section", lambda: check_V5_no_feedback(post_verify, eval_name)),
        ("V6: Verdict explanation", lambda: check_V6_verdict_explanation(post_verify, eval_name)),
    ]

    for name, check_fn in checks:
        try:
            passed, evidence = check_fn()
        except Exception as e:
            passed, evidence = False, f"Error: {e}"
        results.append({"assertion": name, "passed": passed, "evidence": evidence})

    return results, None


def grade_eval(eval_name, config, clean_dir):
    """Grade all phases for one eval+config."""
    grading = {"eval": eval_name, "config": config, "phases": {}}

    # Grade each phase
    for phase, grade_fn in [
        ("red", lambda: grade_red(eval_name, config, clean_dir)),
        ("green", lambda: grade_green(eval_name, config)),
        ("verify", lambda: grade_verify(eval_name, config)),
    ]:
        results, error = grade_fn()
        if error:
            grading["phases"][phase] = {"error": error, "results": []}
        else:
            passed = sum(1 for r in results if r["passed"])
            total = len(results)
            grading["phases"][phase] = {
                "results": results,
                "summary": {
                    "passed": passed,
                    "failed": total - passed,
                    "total": total,
                    "pass_rate": round(passed / total, 2) if total > 0 else 0,
                },
            }

    # Overall summary
    all_results = []
    for phase_data in grading["phases"].values():
        all_results.extend(phase_data.get("results", []))
    total = len(all_results)
    passed = sum(1 for r in all_results if r["passed"])
    grading["overall"] = {
        "passed": passed,
        "failed": total - passed,
        "total": total,
        "pass_rate": round(passed / total, 2) if total > 0 else 0,
    }

    return grading


def build_benchmark(all_gradings):
    """Build benchmark comparing with_skill vs without_skill."""
    benchmark = {"evals": {}, "summary": {}}

    for eval_name in EVAL_NAMES:
        ws = all_gradings.get((eval_name, "with_skill"))
        wo = all_gradings.get((eval_name, "without_skill"))

        eval_bench = {"phases": {}}
        for phase in ["red", "green", "verify"]:
            ws_phase = ws["phases"].get(phase, {}) if ws else {}
            wo_phase = wo["phases"].get(phase, {}) if wo else {}
            ws_rate = ws_phase.get("summary", {}).get("pass_rate", 0)
            wo_rate = wo_phase.get("summary", {}).get("pass_rate", 0)
            eval_bench["phases"][phase] = {
                "with_skill": ws_rate,
                "without_skill": wo_rate,
                "delta": round(ws_rate - wo_rate, 2),
            }

        ws_overall = ws["overall"]["pass_rate"] if ws else 0
        wo_overall = wo["overall"]["pass_rate"] if wo else 0
        eval_bench["overall"] = {
            "with_skill": ws_overall,
            "without_skill": wo_overall,
            "delta": round(ws_overall - wo_overall, 2),
        }
        benchmark["evals"][eval_name] = eval_bench

    # Aggregate summary
    ws_rates = [
        all_gradings[(e, "with_skill")]["overall"]["pass_rate"]
        for e in EVAL_NAMES if (e, "with_skill") in all_gradings
    ]
    wo_rates = [
        all_gradings[(e, "without_skill")]["overall"]["pass_rate"]
        for e in EVAL_NAMES if (e, "without_skill") in all_gradings
    ]
    benchmark["summary"] = {
        "with_skill_avg": round(sum(ws_rates) / len(ws_rates), 2) if ws_rates else 0,
        "without_skill_avg": round(sum(wo_rates) / len(wo_rates), 2) if wo_rates else 0,
    }

    return benchmark


def print_table(all_gradings):
    """Print comparison table."""
    print(f"\n{'=' * 80}")
    print(f"{'Eval':<20} {'Phase':<10} {'With Skill':>12} {'Without':>12} {'Delta':>8}")
    print(f"{'-' * 80}")

    for eval_name in EVAL_NAMES:
        for phase in ["red", "green", "verify"]:
            ws = all_gradings.get((eval_name, "with_skill"))
            wo = all_gradings.get((eval_name, "without_skill"))
            ws_rate = ws["phases"][phase]["summary"]["pass_rate"] if ws and "summary" in ws["phases"].get(phase, {}) else 0
            wo_rate = wo["phases"][phase]["summary"]["pass_rate"] if wo and "summary" in wo["phases"].get(phase, {}) else 0
            delta = ws_rate - wo_rate
            label = eval_name if phase == "red" else ""
            print(f"{label:<20} {phase:<10} {ws_rate:>11.0%} {wo_rate:>11.0%} {delta:>+7.0%}")
        print()

    print(f"{'=' * 80}")


def main():
    # Determine clean snapshot directories
    snapshots_dir = WORKSPACE / "snapshots"
    clean_dirs = {
        "tag-model-schema": snapshots_dir / "clean-tag-model",
        "jwt-auth-replace": snapshots_dir / "clean-jwt-auth",
    }

    all_gradings = {}
    for eval_name in EVAL_NAMES:
        clean = clean_dirs[eval_name]
        for config in CONFIGS:
            config_dir = ITER_DIR / eval_name / config
            if not config_dir.exists():
                print(f"Skipping {eval_name}/{config} — directory not found")
                continue

            print(f"Grading {eval_name}/{config}...")
            grading = grade_eval(eval_name, config, clean)
            all_gradings[(eval_name, config)] = grading

            # Save grading
            out_path = config_dir / "grading.json"
            out_path.write_text(json.dumps(grading, indent=2))

            # Print phase summaries
            for phase, data in grading["phases"].items():
                if "summary" in data:
                    s = data["summary"]
                    print(f"  {phase}: {s['pass_rate']:.0%} ({s['passed']}/{s['total']})")
                else:
                    print(f"  {phase}: {data.get('error', 'no data')}")

    if all_gradings:
        print_table(all_gradings)

        # Save benchmark
        benchmark = build_benchmark(all_gradings)
        bench_path = ITER_DIR / "benchmark.json"
        bench_path.write_text(json.dumps(benchmark, indent=2))
        print(f"\nBenchmark saved to {bench_path}")


if __name__ == "__main__":
    main()
