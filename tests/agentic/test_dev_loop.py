import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "agentic"))

from common import changed_stats  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEV_LOOP = ROOT / "scripts" / "agentic" / "dev_loop.py"


def complete_issue(tmp_path: Path) -> Path:
    path = tmp_path / "issue.md"
    path.write_text(
        """## Context

Make a tiny change.

## Acceptance Criteria

- [ ] A file is updated.

## Tests/Evals

- The smoke command passes.

## Verification

- Run the smoke command.

## Agent Instructions

Use the command provider.

## Out of Scope

No unrelated files.
""",
        encoding="utf-8",
    )
    return path


def run_git(path: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=path, check=True, capture_output=True, text=True)


def copy_contract_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / "agentic").mkdir(parents=True)
    (repo / "scripts" / "agentic").mkdir(parents=True)
    contract = json.loads((ROOT / "agentic" / "contract.json").read_text(encoding="utf-8"))
    contract["verification"]["commands"] = ["python3 -m json.tool agentic/contract.json"]
    (repo / "agentic" / "contract.json").write_text(
        json.dumps(contract, indent=2) + "\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True, text=True)
    run_git(repo, "config", "user.email", "agentic@example.com")
    run_git(repo, "config", "user.name", "Agentic Tests")
    run_git(repo, "add", "agentic/contract.json")
    run_git(repo, "commit", "-m", "initial")
    return repo


def test_runner_exits_cleanly_when_pause_file_exists(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)
    (repo / ".dev-loop-pause").write_text("pause\n", encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "1",
            "--issue-title",
            "Paused issue",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready",
        ],
        cwd=repo,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 0
    assert payload["status"] == "paused"


def test_runner_exits_cleanly_when_loop_paused_env_is_set(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)
    env = os.environ.copy()
    env["LOOP_PAUSED"] = "true"

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "1",
            "--issue-title",
            "Paused env issue",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready",
        ],
        cwd=repo,
        env=env,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 0
    assert payload["status"] == "paused"


def test_runner_refuses_stop_labels(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "1",
            "--issue-title",
            "Blocked issue",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready,needs-human",
        ],
        cwd=repo,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 2
    assert payload["status"] == "issue-quality-failed"


def test_runner_refuses_dirty_worktree(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)
    (repo / "dirty.txt").write_text("existing change\n", encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "1",
            "--issue-title",
            "Dirty worktree issue",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready",
        ],
        cwd=repo,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 2
    assert payload["status"] == "dirty-worktree"


def test_runner_opens_no_pr_when_verification_fails(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)
    contract = json.loads((repo / "agentic" / "contract.json").read_text(encoding="utf-8"))
    contract["verification"]["commands"] = ["python3 missing-file.py"]
    (repo / "agentic" / "contract.json").write_text(json.dumps(contract), encoding="utf-8")
    run_git(repo, "add", "agentic/contract.json")
    run_git(repo, "commit", "-m", "set failing verification")
    env = os.environ.copy()
    env["AGENTIC_PROVIDER_COMMAND"] = (
        f'{sys.executable} -c "from pathlib import Path; '
        "Path('agent-output.txt').write_text('done\\n', encoding='utf-8')\""
    )

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "2",
            "--issue-title",
            "Failing verification",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready",
            "--provider",
            "command",
        ],
        cwd=repo,
        env=env,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 2
    assert payload["action"] == "comment-only"
    assert payload["verification_ok"] is False


def test_runner_marks_passing_change_ready_for_pr(tmp_path):
    repo = copy_contract_repo(tmp_path)
    issue = complete_issue(tmp_path)
    env = os.environ.copy()
    env["AGENTIC_PROVIDER_COMMAND"] = (
        f'{sys.executable} -c "from pathlib import Path; '
        "Path('agent-output.txt').write_text('done\\n', encoding='utf-8')\""
    )

    result = subprocess.run(
        [
            sys.executable,
            str(DEV_LOOP),
            "--issue-number",
            "3",
            "--issue-title",
            "Passing verification",
            "--issue-file",
            str(issue),
            "--labels",
            "agent:ready",
            "--provider",
            "command",
        ],
        cwd=repo,
        env=env,
        text=True,
        capture_output=True,
    )

    payload = json.loads((repo / "agentic-dev-loop-result.json").read_text(encoding="utf-8"))
    assert result.returncode == 0
    assert payload["action"] == "open-pr"
    assert payload["status"] == "ready-for-pr"
    assert changed_stats(repo)["changed_files"] >= 1
