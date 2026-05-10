#!/usr/bin/env python3
"""Read-only repo doctor for agentic delivery rollout readiness."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

CORE_REPOS = [
    "/Users/kk/Code/notion-local",
    "/Users/kk/Code/notion-local/bcai-website",
    "/Users/kk/Code/notion-local/rafiki",
    "/Users/kk/Code/cmvan-keynote",
    "/Users/kk/Code/futureproof-festival",
    "/Users/kk/Code/debbie-dots",
    "/Users/kk/Code/spektorAI",
]


def run_git(path: Path, args: list[str]) -> str:
    result = subprocess.run(["git", "-C", str(path), *args], text=True, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def classify(path: Path) -> str:
    has_contract = (path / "agentic" / "contract.json").exists()
    has_workflows = any((path / ".github" / "workflows").glob("agentic-*.yml"))
    has_docs = (path / "docs" / "LINEAR-GITHUB-PIPELINE.md").exists()
    if has_contract and has_workflows:
        return "wired"
    if has_docs:
        return "docs-only"
    return "missing"


def inspect(path: Path) -> dict[str, Any]:
    return {
        "path": str(path),
        "exists": path.exists(),
        "remote": run_git(path, ["remote", "get-url", "origin"]) if path.exists() else "",
        "branch": run_git(path, ["branch", "--show-current"]) if path.exists() else "",
        "status": run_git(path, ["status", "--short"]) if path.exists() else "",
        "has_contract": (path / "agentic" / "contract.json").exists(),
        "has_delivery_docs": (path / "docs" / "LINEAR-GITHUB-PIPELINE.md").exists(),
        "has_pr_template": (path / ".github" / "PULL_REQUEST_TEMPLATE.md").exists(),
        "agentic_workflows": sorted(
            item.name for item in (path / ".github" / "workflows").glob("agentic-*.yml")
        )
        if (path / ".github" / "workflows").exists()
        else [],
        "classification": classify(path) if path.exists() else "blocked",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--core", action="store_true")
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--json-output")
    args = parser.parse_args()
    paths = [Path(path) for path in (CORE_REPOS if args.core else args.paths)]
    payload = {"repos": [inspect(path) for path in paths]}
    text = json.dumps(payload, indent=2, sort_keys=True)
    if args.json_output:
        Path(args.json_output).write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
