#!/usr/bin/env python3
"""Review an agent-created PR against issue acceptance criteria."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from common import read_text_arg, write_json  # noqa: E402


def extract_checkboxes(markdown: str) -> list[str]:
    return [
        match.group(1).strip()
        for match in re.finditer(r"^-\s+\[[ xX]\]\s+(.+)$", markdown, flags=re.MULTILINE)
    ]


def linked_issue_number(pr_body: str) -> str | None:
    match = re.search(r"\bCloses\s+#(\d+)", pr_body, flags=re.IGNORECASE)
    return match.group(1) if match else None


def review_pr(
    issue_body: str, pr_body: str, additions: int, deletions: int, changed_files: int
) -> dict[str, Any]:
    issue_checks = extract_checkboxes(issue_body)
    pr_checks = extract_checkboxes(pr_body)
    has_link = linked_issue_number(pr_body) is not None
    has_verification = bool(
        re.search(r"^##\s+Verification\s*$", pr_body, re.IGNORECASE | re.MULTILINE)
    )
    has_self_check = bool(
        re.search(r"^##\s+Acceptance Self-Check\s*$", pr_body, re.IGNORECASE | re.MULTILINE)
    )
    changed_lines = additions + deletions
    within_limits = changed_files <= 20 and changed_lines <= 500
    ok = bool(issue_checks) and has_link and has_verification and has_self_check and within_limits
    return {
        "ok": ok,
        "verdict": "review-ready" if ok else "needs-human",
        "linked_issue": linked_issue_number(pr_body),
        "issue_acceptance_count": len(issue_checks),
        "pr_self_check_count": len(pr_checks),
        "has_verification": has_verification,
        "has_self_check": has_self_check,
        "within_limits": within_limits,
        "changed_files": changed_files,
        "changed_lines": changed_lines,
        "comment": build_comment(
            ok, issue_checks, has_link, has_verification, has_self_check, within_limits
        ),
    }


def build_comment(
    ok: bool,
    issue_checks: list[str],
    has_link: bool,
    has_verification: bool,
    has_self_check: bool,
    within_limits: bool,
) -> str:
    lines = [
        "## Agentic PR Review",
        "",
        f"Verdict: {'review-ready' if ok else 'needs-human'}",
        "",
        "Checks:",
        f"- Linked issue via `Closes #...`: {'yes' if has_link else 'no'}",
        f"- Issue acceptance criteria found: {len(issue_checks)}",
        f"- PR verification section present: {'yes' if has_verification else 'no'}",
        f"- PR acceptance self-check present: {'yes' if has_self_check else 'no'}",
        f"- Diff within v1 limits: {'yes' if within_limits else 'no'}",
    ]
    if not ok:
        lines.extend(
            [
                "",
                "This PR is not blocked from human review, but the agentic gate is not satisfied.",
            ]
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue-file", required=True)
    parser.add_argument("--pr-body-file", required=True)
    parser.add_argument("--additions", type=int, default=0)
    parser.add_argument("--deletions", type=int, default=0)
    parser.add_argument("--changed-files", type=int, default=0)
    parser.add_argument("--json-output", required=True)
    args = parser.parse_args()
    result = review_pr(
        read_text_arg(args.issue_file),
        read_text_arg(args.pr_body_file),
        args.additions,
        args.deletions,
        args.changed_files,
    )
    write_json(Path(args.json_output), result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
