#!/usr/bin/env python3
"""Cross-repo agentic delivery status report using GitHub CLI when available."""

from __future__ import annotations

import argparse
import json
import subprocess
from typing import Any

CORE_REPOS = [
    "WalksWithASwagger/kk-kb",
    "WalksWithASwagger/bcai-website",
    "WalksWithASwagger/rafiki",
    "WalksWithASwagger/cmvan-keynote",
    "WalksWithASwagger/futureproof-festival",
    "WalksWithASwagger/debbie-dots--polar-steps",
    "WalksWithASwagger/spektorAI",
]


def gh_json(args: list[str]) -> Any:
    result = subprocess.run(["gh", *args], text=True, capture_output=True)
    if result.returncode != 0:
        return {"error": result.stderr.strip() or result.stdout.strip()}
    return json.loads(result.stdout or "[]")


def repo_report(repo: str) -> dict[str, Any]:
    ready = gh_json(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--label",
            "agent:ready",
            "--json",
            "number",
        ]
    )
    blocked = gh_json(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--label",
            "blocked",
            "--json",
            "number",
        ]
    )
    needs_human = gh_json(
        [
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--label",
            "needs-human",
            "--json",
            "number",
        ]
    )
    prs = gh_json(
        [
            "pr",
            "list",
            "--repo",
            repo,
            "--state",
            "open",
            "--json",
            "number,headRefName,isDraft,updatedAt",
        ]
    )
    return {
        "repo": repo,
        "ready_issues": len(ready) if isinstance(ready, list) else ready,
        "blocked_issues": len(blocked) if isinstance(blocked, list) else blocked,
        "needs_human_issues": len(needs_human) if isinstance(needs_human, list) else needs_human,
        "open_agent_prs": [
            pr
            for pr in prs
            if isinstance(pr, dict) and pr.get("headRefName", "").startswith("codex/")
        ]
        if isinstance(prs, list)
        else prs,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", action="append", dest="repos")
    parser.add_argument("--json-output")
    args = parser.parse_args()
    payload = {"repos": [repo_report(repo) for repo in (args.repos or CORE_REPOS)]}
    text = json.dumps(payload, indent=2, sort_keys=True)
    if args.json_output:
        with open(args.json_output, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
