#!/usr/bin/env python3
"""Create or update the standard agentic delivery labels via gh."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from common import load_contract, repo_root, run  # noqa: E402

LABEL_STYLE = {
    "agent:ready": ("0e8a16", "Issue passed intake quality and is ready for an agent attempt."),
    "auto-implement": ("bfdadc", "Legacy ready alias; normalized to agent:ready."),
    "autonomous": ("bfdadc", "Legacy ready alias; normalized to agent:ready."),
    "review-ready": ("5319e7", "Agent-created PR is ready for human review."),
    "needs-human": ("d93f0b", "Agentic automation stopped for human judgment."),
    "blocked": ("b60205", "Work cannot proceed until a blocker is resolved."),
    "in-progress": ("fbca04", "Agentic runner is currently attempting the issue."),
}


def desired_labels(contract: dict[str, Any]) -> list[str]:
    labels = contract["labels"]
    return [
        labels["ready"],
        *labels.get("ready_aliases", []),
        labels["review_ready"],
        *labels["stop"],
    ]


def ensure_label(name: str, root: Path) -> None:
    color, description = LABEL_STYLE.get(name, ("ededed", "Agentic delivery label."))
    create = run(
        [
            "gh",
            "label",
            "create",
            name,
            "--color",
            color,
            "--description",
            description,
        ],
        root,
    )
    if create.returncode == 0:
        return
    run(
        [
            "gh",
            "label",
            "edit",
            name,
            "--color",
            color,
            "--description",
            description,
        ],
        root,
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = repo_root()
    labels = desired_labels(load_contract(root))
    if args.dry_run:
        print("\n".join(labels))
        return 0
    for label in labels:
        ensure_label(label, root)
        print(f"ensured {label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
