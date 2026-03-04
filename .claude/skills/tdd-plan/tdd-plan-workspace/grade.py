#!/usr/bin/env python3
"""Grade tdd-plan eval outputs against assertions."""

import json
import os
import re
import sys

WORKSPACE = os.path.dirname(os.path.abspath(__file__))
ITER_DIR = os.path.join(WORKSPACE, "iteration-1")

# Map each eval to its known output files per configuration
EVAL_FILES = {
    "tag-support": {
        "with_skill": [
            "001-tag-model-and-schema.md",
            "002-add-tags-when-creating-bookmark.md",
            "003-filter-bookmarks-by-tag.md",
            "004-remove-tags-from-bookmark.md",
        ],
        "without_skill": [
            "001-tag-schema-and-model.md",
            "002-add-tags-on-bookmark-create.md",
            "003-return-tags-with-bookmarks.md",
            "004-filter-bookmarks-by-tag.md",
            "005-remove-tag-from-bookmark.md",
            "006-list-all-tags.md",
        ],
    },
    "jwt-auth-refactor": {
        "with_skill": [
            "001-jwt-token-verification-in-auth-middleware.md",
            "002-user-login-endpoint.md",
            "003-refresh-token-endpoint.md",
            "004-logout-endpoint-revoke-tokens.md",
        ],
        "without_skill": [
            "001-add-jwt-dependency-and-config.md",
            "002-create-jwt-token-service.md",
            "003-add-refresh-tokens-table.md",
            "004-create-auth-routes-login-and-token-issue.md",
            "005-create-token-refresh-endpoint.md",
            "006-replace-base64-middleware-with-jwt-verification.md",
            "007-add-logout-endpoint.md",
            "008-update-existing-tests-to-use-jwt-tokens.md",
            "009-add-token-expiration-integration-tests.md",
        ],
    },
    "full-text-search": {
        "with_skill": [
            "001-tag-bookmarks.md",
            "002-search-bookmarks-by-url-and-title.md",
            "003-search-bookmarks-by-tags.md",
        ],
        "without_skill": [
            "001-add-tags-to-bookmarks.md",
            "002-search-bookmarks-by-title.md",
            "003-search-bookmarks-by-url.md",
            "004-search-bookmarks-by-tags.md",
            "005-paginate-search-results.md",
            "006-paginate-bookmarks-listing.md",
        ],
    },
}


def read_task_files(eval_name, config):
    """Read all task files for a given eval+config, return list of (filename, content)."""
    outputs_dir = os.path.join(ITER_DIR, eval_name, config, "outputs")
    files = EVAL_FILES[eval_name][config]
    result = []
    for f in files:
        path = os.path.join(outputs_dir, f)
        if os.path.exists(path):
            with open(path) as fh:
                result.append((f, fh.read()))
        else:
            result.append((f, None))
    return result


def check_file_naming(files):
    """Assert: Task files follow NNN-slug.md naming pattern."""
    pattern = re.compile(r"^\d{3}-[a-z0-9-]+\.md$")
    all_match = all(pattern.match(f) for f, _ in files)
    missing = [f for f, content in files if content is None]
    if missing:
        return False, f"Missing files: {missing}"
    if all_match:
        return True, f"All {len(files)} files match NNN-slug.md pattern"
    bad = [f for f, _ in files if not pattern.match(f)]
    return False, f"Non-matching files: {bad}"


def check_frontmatter_status(files):
    """Assert: Each task file has YAML frontmatter with status: pending."""
    for f, content in files:
        if content is None:
            return False, f"{f} is missing"
        if "status: pending" not in content:
            return False, f"{f} missing 'status: pending'"
    return True, f"All {len(files)} files have status: pending"


def check_frontmatter_priority(files):
    """Assert: Each task file has priority field in frontmatter."""
    for f, content in files:
        if content is None:
            return False, f"{f} is missing"
        if not re.search(r"priority:\s*\w+", content):
            return False, f"{f} missing priority field"
    return True, f"All {len(files)} files have priority field"


def check_frontmatter_depends(files):
    """Assert: Each task file has depends-on field in frontmatter."""
    for f, content in files:
        if content is None:
            return False, f"{f} is missing"
        if not re.search(r"depends-on:", content):
            return False, f"{f} missing depends-on field"
    return True, f"All {len(files)} files have depends-on field"


def check_ac_checkbox_format(files):
    """Assert: ACs use checkbox format (- [ ] Given/When/Then or - [ ] [REMOVE])."""
    for f, content in files:
        if content is None:
            return False, f"{f} is missing"
        # Must have at least one AC with checkbox
        if not re.search(r"- \[ \]", content):
            return False, f"{f} has no checkbox-format ACs"
    return True, f"All {len(files)} files have checkbox-format ACs"


def check_given_when_then(files):
    """Assert: ACs use Given/When/Then structure."""
    found = 0
    for f, content in files:
        if content is None:
            continue
        matches = re.findall(r"- \[ \] Given .+?, when .+?, then", content, re.IGNORECASE)
        found += len(matches)
    if found > 0:
        return True, f"Found {found} Given/When/Then ACs across all files"
    return False, "No Given/When/Then formatted ACs found"


def check_technical_notes_file_refs(files):
    """Assert: Technical Notes reference actual project file paths."""
    project_paths = ["src/", "config/", "tests/", "middleware/", "models/", "routes/"]
    refs_found = []
    for f, content in files:
        if content is None:
            continue
        # Look in Technical Notes section
        tn_match = re.search(r"## Technical Notes(.*?)(?=\n## |\Z)", content, re.DOTALL)
        if tn_match:
            tn_text = tn_match.group(1)
            for p in project_paths:
                if p in tn_text:
                    refs_found.append(f"{f}: {p}")
    if refs_found:
        return True, f"Found {len(refs_found)} file path references: {refs_found[:5]}"
    return False, "No project file path references found in Technical Notes"


def check_http_endpoints(files):
    """Assert: ACs reference concrete HTTP endpoints."""
    methods = re.compile(r"(GET|POST|PUT|DELETE|PATCH)\s+/\w+", re.IGNORECASE)
    found = []
    for f, content in files:
        if content is None:
            continue
        matches = methods.findall(content)
        if matches:
            found.extend(matches)
    if found:
        return True, f"Found {len(found)} HTTP endpoint references"
    return False, "No HTTP endpoint references (GET/POST/DELETE /path) found"


def check_bookmark_model_ref(files):
    """Assert: References existing Bookmark model."""
    for f, content in files:
        if content is None:
            continue
        if "Bookmark" in content and ("model" in content.lower() or "src/models" in content.lower()):
            return True, f"Found Bookmark model reference in {f}"
    return False, "No reference to existing Bookmark model found"


def check_remove_acs(files):
    """Assert: Contains [REMOVE] ACs."""
    found = 0
    for f, content in files:
        if content is None:
            continue
        matches = re.findall(r"\[REMOVE\]", content)
        found += len(matches)
    if found > 0:
        return True, f"Found {found} [REMOVE] ACs"
    return False, "No [REMOVE] ACs found"


def check_auth_middleware_ref(files):
    """Assert: References src/middleware/auth.js."""
    for f, content in files:
        if content is None:
            continue
        if "middleware/auth" in content or "auth.js" in content:
            return True, f"Found auth middleware reference in {f}"
    return False, "No reference to src/middleware/auth.js found"


def check_mixed_ac_formats(files):
    """Assert: Has both [REMOVE] and Given/When/Then ACs."""
    has_remove = False
    has_gwt = False
    for f, content in files:
        if content is None:
            continue
        if "[REMOVE]" in content:
            has_remove = True
        if re.search(r"Given .+?, when", content, re.IGNORECASE):
            has_gwt = True
    if has_remove and has_gwt:
        return True, "Both [REMOVE] and Given/When/Then ACs present"
    missing = []
    if not has_remove:
        missing.append("[REMOVE]")
    if not has_gwt:
        missing.append("Given/When/Then")
    return False, f"Missing AC format(s): {', '.join(missing)}"


def check_fts_mention(files):
    """Assert: Technical notes mention search approach (FTS, LIKE, full-text)."""
    keywords = ["FTS", "full-text", "full text", "LIKE", "fts5", "fts4", "virtual table"]
    for f, content in files:
        if content is None:
            continue
        for kw in keywords:
            if kw.lower() in content.lower():
                return True, f"Found '{kw}' reference in {f}"
    return False, "No mention of search approach (FTS/LIKE/full-text) found"


def check_pagination_params(files):
    """Assert: Pagination ACs include concrete query parameters."""
    params = ["page", "limit", "offset", "pageSize", "per_page"]
    found = []
    for f, content in files:
        if content is None:
            continue
        for p in params:
            if p.lower() in content.lower():
                found.append(p)
    if found:
        return True, f"Found pagination parameters: {list(set(found))}"
    return False, "No concrete pagination query parameters found"


def check_vertical_slicing(files):
    """Assert: Stories appear vertically sliced (titles suggest behavior, not layers)."""
    layer_keywords = ["database", "schema only", "db model only", "add table", "add route only", "add ui only"]
    suspect = []
    for f, content in files:
        if content is None:
            continue
        # Check title (first # heading)
        title_match = re.search(r"^# (.+)$", content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).lower()
            for kw in layer_keywords:
                if kw in title:
                    suspect.append(f"{f}: '{title_match.group(1)}'")
    if not suspect:
        return True, f"No layer-only story titles detected across {len(files)} files"
    return False, f"Potentially layer-split stories: {suspect}"


# Define assertions per eval
COMMON_ASSERTIONS = [
    ("Task files follow NNN-slug.md naming pattern", check_file_naming),
    ("Each task file has YAML frontmatter with status: pending", check_frontmatter_status),
    ("Each task file has priority field in frontmatter", check_frontmatter_priority),
    ("Each task file has depends-on field in frontmatter", check_frontmatter_depends),
    ("ACs use checkbox format", check_ac_checkbox_format),
    ("ACs use Given/When/Then structure", check_given_when_then),
    ("Technical Notes reference actual project file paths", check_technical_notes_file_refs),
    ("Stories appear vertically sliced", check_vertical_slicing),
]

EVAL_ASSERTIONS = {
    "tag-support": [
        ("ACs reference concrete HTTP endpoints", check_http_endpoints),
        ("References existing Bookmark model", check_bookmark_model_ref),
    ],
    "jwt-auth-refactor": [
        ("Contains [REMOVE] ACs for base64 auth removal", check_remove_acs),
        ("References src/middleware/auth.js", check_auth_middleware_ref),
        ("Has both [REMOVE] and Given/When/Then AC formats", check_mixed_ac_formats),
    ],
    "full-text-search": [
        ("Technical notes mention search approach (FTS/LIKE)", check_fts_mention),
        ("Pagination ACs include concrete query parameters", check_pagination_params),
    ],
}


def grade_run(eval_name, config):
    """Grade a single run and return grading results."""
    files = read_task_files(eval_name, config)
    assertions = COMMON_ASSERTIONS + EVAL_ASSERTIONS[eval_name]

    expectations = []
    passed_count = 0
    for text, check_fn in assertions:
        passed, evidence = check_fn(files)
        expectations.append({
            "text": text,
            "passed": passed,
            "evidence": evidence,
        })
        if passed:
            passed_count += 1

    total = len(assertions)

    # Read timing if available
    timing_path = os.path.join(ITER_DIR, eval_name, config, "timing.json")
    timing = {}
    if os.path.exists(timing_path):
        with open(timing_path) as f:
            timing = json.load(f)

    return {
        "expectations": expectations,
        "summary": {
            "passed": passed_count,
            "failed": total - passed_count,
            "total": total,
            "pass_rate": round(passed_count / total, 2) if total > 0 else 0,
        },
        "timing": timing,
        "eval_feedback": {"suggestions": [], "overall": ""},
    }


def main():
    for eval_name in EVAL_FILES:
        for config in ["with_skill", "without_skill"]:
            print(f"Grading {eval_name}/{config}...")
            result = grade_run(eval_name, config)
            out_path = os.path.join(ITER_DIR, eval_name, config, "grading.json")
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2)
            print(f"  Pass rate: {result['summary']['pass_rate']} "
                  f"({result['summary']['passed']}/{result['summary']['total']})")

    # Print comparison table
    print("\n" + "=" * 70)
    print(f"{'Eval':<20} {'With Skill':>15} {'Without Skill':>15} {'Delta':>10}")
    print("-" * 70)
    for eval_name in EVAL_FILES:
        ws = grade_run(eval_name, "with_skill")
        wo = grade_run(eval_name, "without_skill")
        ws_rate = ws["summary"]["pass_rate"]
        wo_rate = wo["summary"]["pass_rate"]
        delta = ws_rate - wo_rate
        print(f"{eval_name:<20} {ws_rate:>14.0%} {wo_rate:>14.0%} {delta:>+9.0%}")
    print("=" * 70)


if __name__ == "__main__":
    main()
