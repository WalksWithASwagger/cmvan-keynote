#!/usr/bin/env python3
"""Shared helpers for the agentic delivery scripts."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

ROOT_MARKERS = ("agentic/contract.json", ".git")


def repo_root(start: Path | None = None) -> Path:
    current = (start or Path.cwd()).resolve()
    for candidate in (current, *current.parents):
        if all((candidate / marker).exists() for marker in ROOT_MARKERS):
            return candidate
    raise RuntimeError(f"Could not find repo root from {current}")


def load_contract(root: Path | None = None) -> dict[str, Any]:
    base = root or repo_root()
    path = base / "agentic" / "contract.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def slugify(value: str, max_length: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    slug = re.sub(r"-+", "-", slug)
    return (slug or "agentic-work")[:max_length].rstrip("-")


def run(
    command: str | list[str],
    cwd: Path,
    *,
    env: dict[str, str] | None = None,
    check: bool = False,
) -> subprocess.CompletedProcess[str]:
    if isinstance(command, list):
        args = command
        shell = False
    else:
        args = command
        shell = True
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    result = subprocess.run(
        args,
        cwd=str(cwd),
        env=merged_env,
        shell=shell,
        text=True,
        capture_output=True,
        check=False,
    )
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or f"Command failed: {command}")
    return result


def git_output(args: list[str], cwd: Path) -> str:
    result = run(["git", *args], cwd, check=True)
    return result.stdout.strip()


def changed_stats(cwd: Path) -> dict[str, Any]:
    result = run(["git", "diff", "--numstat"], cwd)
    files: list[dict[str, Any]] = []
    total_lines = 0
    seen: set[str] = set()
    for line in result.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) != 3:
            continue
        added_raw, deleted_raw, path = parts
        added = int(added_raw) if added_raw.isdigit() else 0
        deleted = int(deleted_raw) if deleted_raw.isdigit() else 0
        total_lines += added + deleted
        seen.add(path)
        files.append({"path": path, "added": added, "deleted": deleted})
    status = run(["git", "status", "--porcelain"], cwd)
    for line in status.stdout.splitlines():
        if not line.startswith("?? "):
            continue
        path = line[3:]
        if path in seen:
            continue
        file_path = cwd / path
        added = count_text_lines(file_path)
        total_lines += added
        files.append({"path": path, "added": added, "deleted": 0, "untracked": True})
    return {
        "changed_files": len(files),
        "changed_lines": total_lines,
        "files": files,
    }


def count_text_lines(path: Path) -> int:
    if not path.is_file():
        return 0
    try:
        with path.open(encoding="utf-8") as handle:
            return sum(1 for _ in handle)
    except UnicodeDecodeError:
        return 0


def read_text_arg(path: str | None, fallback: str = "") -> str:
    if not path:
        return fallback
    return Path(path).read_text(encoding="utf-8")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
