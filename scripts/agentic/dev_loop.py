#!/usr/bin/env python3
"""Local/GitHub Actions dev-loop orchestration for one issue."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from common import (  # noqa: E402
    changed_stats,
    load_contract,
    read_text_arg,
    repo_root,
    run,
    slugify,
    write_json,
)
from issue_lint import lint_issue, parse_labels  # noqa: E402
from provider_adapter import run_provider  # noqa: E402


def run_verification(commands: list[str], root: Path) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for command in commands:
        result = run(command, root)
        results.append(
            {
                "command": command,
                "returncode": result.returncode,
                "stdout": result.stdout[-4000:],
                "stderr": result.stderr[-4000:],
                "ok": result.returncode == 0,
            }
        )
        if result.returncode != 0:
            break
    return results


def has_pause_signal(root: Path) -> bool:
    return (root / ".dev-loop-pause").exists() or os.environ.get("LOOP_PAUSED", "").lower() not in {
        "",
        "false",
        "0",
        "no",
    }


def build_pr_body(
    issue_number: str, provider_result: dict[str, Any], verification: list[dict[str, Any]]
) -> str:
    stats = provider_result.get("stats", {})
    checks = "\n".join(
        f"- [{'x' if item['ok'] else ' '}] `{item['command']}`" for item in verification
    )
    return f"""## Summary

{provider_result.get("summary", "Agent provider completed.")}

## Related Issues

Closes #{issue_number}

## Agentic Delivery

- Provider: `{provider_result.get("provider")}`
- Changed files: `{stats.get("changed_files", 0)}`
- Changed lines: `{stats.get("changed_lines", 0)}`

## Acceptance Self-Check

- [x] Issue quality gate passed before implementation.
- [x] Provider adapter completed without reporting failure.
- [x] Verification commands were executed.

## Verification

{checks or "- [ ] No verification commands configured."}
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue-number", required=True)
    parser.add_argument("--issue-title", required=True)
    parser.add_argument("--issue-file", required=True)
    parser.add_argument("--labels", default="")
    parser.add_argument("--provider", default=None)
    parser.add_argument("--json-output", default="agentic-dev-loop-result.json")
    parser.add_argument("--pr-body-output", default="agentic-pr-body.md")
    args = parser.parse_args()

    root = repo_root()
    contract = load_contract(root)
    issue_body = read_text_arg(args.issue_file)
    labels = parse_labels(args.labels)
    lint = lint_issue(issue_body, labels, contract)
    result: dict[str, Any] = {
        "ok": False,
        "issue_number": args.issue_number,
        "issue_title": args.issue_title,
        "slug": slugify(args.issue_title),
        "lint": lint,
        "provider": None,
        "verification": [],
        "stats": changed_stats(root),
        "action": "none",
    }
    if has_pause_signal(root):
        result.update({"status": "paused", "message": "Pause signal is active."})
        write_json(Path(args.json_output), result)
        return 0
    if not lint["ok"]:
        result.update({"status": "issue-quality-failed", "message": lint["message"]})
        write_json(Path(args.json_output), result)
        return 2
    initial_stats = changed_stats(root)
    if initial_stats["changed_files"] > 0:
        result.update(
            {
                "status": "dirty-worktree",
                "message": "Worktree must be clean before the agentic dev loop starts.",
                "stats": initial_stats,
            }
        )
        write_json(Path(args.json_output), result)
        return 2
    provider_name = (
        args.provider or os.environ.get("AGENTIC_PROVIDER") or contract["provider"]["default"]
    )
    provider_result = run_provider(provider_name, Path(args.issue_file), root)
    result["provider"] = provider_result
    result["stats"] = changed_stats(root)
    if not provider_result["ok"]:
        result.update({"status": "provider-failed", "message": provider_result["summary"]})
        write_json(Path(args.json_output), result)
        return 2
    verification = run_verification(contract["verification"]["commands"], root)
    result["verification"] = verification
    result["stats"] = changed_stats(root)
    verify_ok = all(item["ok"] for item in verification)
    limits = contract["limits"]
    stats = result["stats"]
    limits_ok = (
        stats["changed_files"] <= limits["max_changed_files"]
        and stats["changed_lines"] <= limits["max_changed_lines"]
    )
    has_changes = stats["changed_files"] > 0
    result.update(
        {
            "ok": verify_ok and limits_ok and has_changes,
            "status": "ready-for-pr" if verify_ok and limits_ok and has_changes else "no-pr",
            "verification_ok": verify_ok,
            "limits_ok": limits_ok,
            "has_changes": has_changes,
            "action": "open-pr" if verify_ok and limits_ok and has_changes else "comment-only",
        }
    )
    Path(args.pr_body_output).write_text(
        build_pr_body(args.issue_number, provider_result, verification),
        encoding="utf-8",
    )
    write_json(Path(args.json_output), result)
    return 0 if result["ok"] or provider_name == "noop" else 2


if __name__ == "__main__":
    raise SystemExit(main())
