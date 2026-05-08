#!/usr/bin/env python3
"""Provider adapter for agentic issue implementation."""

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
    write_json,
)


def run_noop(issue_body: str, root: Path) -> dict[str, Any]:
    return {
        "ok": True,
        "provider": "noop",
        "status": "dry-run",
        "summary": "Noop provider validated the runner path without changing files.",
        "issue_excerpt": issue_body.strip()[:500],
        "stats": changed_stats(root),
        "verification_log": "Noop provider made no code changes.",
    }


def run_command(issue_file: Path, root: Path, contract: dict[str, Any]) -> dict[str, Any]:
    env_name = contract["provider"].get("command_env", "AGENTIC_PROVIDER_COMMAND")
    command = os.environ.get(env_name)
    if not command:
        return {
            "ok": False,
            "provider": "command",
            "status": "missing-command",
            "summary": f"{env_name} is not set.",
            "stats": changed_stats(root),
            "verification_log": "",
        }
    result = run(
        command,
        root,
        env={
            "AGENTIC_ISSUE_FILE": str(issue_file),
            "AGENTIC_REPO_ROOT": str(root),
        },
    )
    stats = changed_stats(root)
    return {
        "ok": result.returncode == 0,
        "provider": "command",
        "status": "completed" if result.returncode == 0 else "failed",
        "summary": "Command provider completed."
        if result.returncode == 0
        else "Command provider failed.",
        "returncode": result.returncode,
        "stdout": result.stdout[-4000:],
        "stderr": result.stderr[-4000:],
        "stats": stats,
        "verification_log": "\n".join(
            part for part in [result.stdout, result.stderr] if part
        ).strip(),
    }


def run_provider(provider: str, issue_file: Path, root: Path) -> dict[str, Any]:
    contract = load_contract(root)
    allowed = set(contract["provider"]["allowed"])
    if provider not in allowed:
        return {
            "ok": False,
            "provider": provider,
            "status": "provider-not-allowed",
            "summary": f"Provider {provider!r} is not in allowed providers: {sorted(allowed)}",
            "stats": changed_stats(root),
            "verification_log": "",
        }
    issue_body = read_text_arg(str(issue_file))
    if provider == "noop":
        return run_noop(issue_body, root)
    if provider == "command":
        return run_command(issue_file, root, contract)
    return {
        "ok": False,
        "provider": provider,
        "status": "not-implemented",
        "summary": f"Provider {provider!r} has no adapter implementation.",
        "stats": changed_stats(root),
        "verification_log": "",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", default=None)
    parser.add_argument("--issue-file", required=True)
    parser.add_argument("--json-output", required=True)
    args = parser.parse_args()
    root = repo_root()
    contract = load_contract(root)
    provider = (
        args.provider or os.environ.get("AGENTIC_PROVIDER") or contract["provider"]["default"]
    )
    result = run_provider(provider, Path(args.issue_file), root)
    write_json(Path(args.json_output), result)
    print(result["summary"])
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
