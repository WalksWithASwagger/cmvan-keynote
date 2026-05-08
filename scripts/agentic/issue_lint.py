#!/usr/bin/env python3
"""Validate agent-ready GitHub issues before runners start work."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from common import load_contract, read_text_arg, repo_root, write_json  # noqa: E402


def parse_labels(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [label.strip() for label in raw.split(",") if label.strip()]


def section_exists(body: str, title: str) -> bool:
    pattern = rf"^##\s+{re.escape(title)}\s*$"
    return bool(re.search(pattern, body, flags=re.IGNORECASE | re.MULTILINE))


def lint_issue(body: str, labels: list[str], contract: dict[str, Any]) -> dict[str, Any]:
    label_config = contract["labels"]
    quality = contract["issue_quality"]
    ready = label_config["ready"]
    aliases = set(label_config.get("ready_aliases", []))
    label_set = set(labels)
    ready_seen = ready in label_set or bool(label_set & aliases)
    alias_labels = sorted(label_set & aliases)
    stop_labels = sorted(label_set & set(label_config["stop"]))
    missing = [
        section for section in quality["required_sections"] if not section_exists(body, section)
    ]
    acceptance_has_checklist = bool(re.search(r"^-\s+\[[ xX]\]\s+\S+", body, flags=re.MULTILINE))
    ok = ready_seen and not stop_labels and not missing and acceptance_has_checklist
    return {
        "ok": ok,
        "ready_seen": ready_seen,
        "canonical_ready": ready in label_set,
        "alias_labels": alias_labels,
        "stop_labels": stop_labels,
        "missing_sections": missing,
        "acceptance_has_checklist": acceptance_has_checklist,
        "normalized_ready_label": ready,
        "message": build_message(missing, stop_labels, ready_seen, acceptance_has_checklist),
    }


def build_message(
    missing: list[str],
    stop_labels: list[str],
    ready_seen: bool,
    acceptance_has_checklist: bool,
) -> str:
    if stop_labels:
        return f"Stop labels present: {', '.join(stop_labels)}"
    if not ready_seen:
        return "No ready label found"
    problems: list[str] = []
    if missing:
        problems.append("missing sections: " + ", ".join(missing))
    if not acceptance_has_checklist:
        problems.append("acceptance criteria must include markdown checkboxes")
    return "; ".join(problems) if problems else "Issue quality gate passed"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue-file")
    parser.add_argument("--labels")
    parser.add_argument("--from-env", action="store_true")
    parser.add_argument("--json-output")
    args = parser.parse_args()

    body = os.environ.get("ISSUE_BODY", "") if args.from_env else read_text_arg(args.issue_file)
    labels_raw = os.environ.get("ISSUE_LABELS", "") if args.from_env else args.labels
    result = lint_issue(body, parse_labels(labels_raw), load_contract(repo_root()))
    output = json.dumps(result, indent=2, sort_keys=True)
    if args.json_output:
        write_json(Path(args.json_output), result)
    print(output)
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
