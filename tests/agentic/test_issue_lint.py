import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "agentic"))

from common import load_contract  # noqa: E402
from ensure_labels import desired_labels  # noqa: E402
from issue_lint import lint_issue  # noqa: E402


def complete_issue() -> str:
    return """## Context

Bug report.

## Acceptance Criteria

- [ ] The failing path is covered.

## Tests/Evals

- Add a regression test.

## Verification

- Run the repo verification command.

## Agent Instructions

Keep the diff scoped.

## Out of Scope

No unrelated refactors.
"""


def test_rejects_ready_issue_missing_tests_and_evals():
    contract = load_contract(Path(__file__).resolve().parents[2])
    body = complete_issue().replace("## Tests/Evals\n\n- Add a regression test.\n\n", "")

    result = lint_issue(body, ["agent:ready"], contract)

    assert not result["ok"]
    assert "Tests/Evals" in result["missing_sections"]


def test_accepts_complete_agent_ready_issue():
    contract = load_contract(Path(__file__).resolve().parents[2])

    result = lint_issue(complete_issue(), ["agent:ready"], contract)

    assert result["ok"]
    assert result["normalized_ready_label"] == "agent:ready"


def test_accepts_alias_and_requests_normalization():
    contract = load_contract(Path(__file__).resolve().parents[2])

    result = lint_issue(complete_issue(), ["autonomous"], contract)

    assert result["ok"]
    assert result["canonical_ready"] is False
    assert result["alias_labels"] == ["autonomous"]
    assert result["normalized_ready_label"] == "agent:ready"


def test_stop_labels_block_runner():
    contract = load_contract(Path(__file__).resolve().parents[2])

    result = lint_issue(complete_issue(), ["agent:ready", "blocked"], contract)

    assert not result["ok"]
    assert result["stop_labels"] == ["blocked"]


def test_standard_label_set_includes_aliases_and_stop_labels():
    contract = load_contract(Path(__file__).resolve().parents[2])

    labels = desired_labels(contract)

    assert "agent:ready" in labels
    assert "auto-implement" in labels
    assert "autonomous" in labels
    assert "review-ready" in labels
    assert "needs-human" in labels
    assert "blocked" in labels
    assert "in-progress" in labels
