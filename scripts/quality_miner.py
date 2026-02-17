#!/usr/bin/env python3
"""
Quality mining for PostHog repo.
Detects test-touch per merge commit via git diff-tree.
Usage: python quality_miner.py <repo_path> <merge_shas_json>
Output: JSON to stdout with touchedTests map.
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set

# Test file heuristics
TEST_PATH_PATTERNS = [
    r'/test/',
    r'/tests/',
    r'__tests__',
    r'\.test\.(ts|js|tsx|jsx)$',
    r'\.spec\.(ts|js|tsx|jsx)$',
    r'test_[^/]+\.py$',
    r'[^/]+_test\.py$',
]
TEST_PATH_RE = re.compile('|'.join(f'({p})' for p in TEST_PATH_PATTERNS))


def is_test_path(filepath: str) -> bool:
    """True if file path matches test heuristics."""
    if not filepath:
        return False
    path = filepath.replace('\\', '/')
    return bool(TEST_PATH_RE.search(path))


def get_modified_files_git(repo_path: str, sha: str) -> Optional[List[str]]:
    """Run git diff-tree for merge commit; returns list of paths or None if lookup failed."""
    result = subprocess.run(
        ["git", "diff-tree", "-m", "--no-commit-id", "--name-only", "-r", sha],
        cwd=repo_path,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        return None
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def compute_touched_tests(repo_path: str, merge_shas: Set[str]) -> Dict[str, Optional[bool]]:
    """Use git diff-tree to detect test-touch per merge SHA. Fetch --deepen 200 once on failure."""
    touched: Dict[str, Optional[bool]] = {}
    failed: List[str] = []
    for sha in merge_shas:
        paths = get_modified_files_git(repo_path, sha)
        if paths is None:
            failed.append(sha)
        else:
            touched[sha] = any(is_test_path(p) for p in paths)

    if failed:
        subprocess.run(
            ["git", "fetch", "--deepen", "200"],
            cwd=repo_path,
            capture_output=True,
            timeout=60,
        )
        for sha in failed:
            paths = get_modified_files_git(repo_path, sha)
            if paths is None:
                touched[sha] = None
            else:
                touched[sha] = any(is_test_path(p) for p in paths)

    for sha in merge_shas:
        if sha not in touched:
            touched[sha] = None
    return touched


def main() -> None:
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: quality_miner.py <repo_path> <merge_shas_json>"}))
        sys.exit(1)

    repo_path = sys.argv[1]
    merge_shas_json = sys.argv[2]

    if not Path(repo_path).exists():
        print(json.dumps({"error": f"Repo path does not exist: {repo_path}"}))
        sys.exit(1)

    try:
        merge_shas_raw = json.loads(merge_shas_json)
        merge_shas = {s.lower() for s in merge_shas_raw if isinstance(s, str)}
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid merge_shas JSON: {e}"}))
        sys.exit(1)

    try:
        touched_tests = compute_touched_tests(repo_path, merge_shas)
        print(json.dumps({"touchedTests": touched_tests}))
    except Exception as e:
        print(json.dumps({"error": str(e), "touchedTests": {}}))
        sys.exit(1)


if __name__ == "__main__":
    main()
