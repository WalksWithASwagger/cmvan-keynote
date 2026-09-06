import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "agentic"))

from common import load_contract
from issue_lint import lint_issue
import issue_quality
from issue_quality import reconcile
from test_issue_lint import complete_issue

CONTRACT = load_contract(Path(__file__).resolve().parents[2])


def issue(labels=None, body=None, state="OPEN"):
    return {"body": complete_issue() if body is None else body,
            "labels": [{"name": name} for name in (labels or ["agent:ready"])],
            "state": state}


def run_snapshots(*snapshots):
    pending = iter(snapshots)
    edits = []
    result = reconcile(lambda: next(pending), lambda *args: edits.append(args), CONTRACT)
    return result, edits


def test_claimed_issue_is_not_demoted_but_execution_stays_blocked():
    _, edits = run_snapshots(issue())
    assert edits == []
    claimed = issue(["agent:ready", "in-progress"])
    _, edits = run_snapshots(claimed)
    assert edits == []
    assert not lint_issue(claimed["body"], ["agent:ready", "in-progress"], CONTRACT)["ok"]


@pytest.mark.parametrize("labels,body", [
    (["agent:ready", "in-progress"], "incomplete"),
    (["agent:ready", "in-progress"], complete_issue().replace("- [ ]", "-")),
    (["agent:ready", "in-progress", "blocked"], complete_issue()),
    (["agent:ready", "in-progress", "needs-human"], complete_issue()),
])
def test_invalid_body_and_explicit_stops_remain_protected(labels, body):
    snapshot = issue(labels, body)
    _, edits = run_snapshots(snapshot, snapshot)
    assert edits[0][0] == ["needs-human"]
    assert edits[0][1] == ["agent:ready"]


def test_alias_normalization_is_idempotent():
    alias = issue(["autonomous"])
    _, edits = run_snapshots(alias, alias)
    assert edits == [(["agent:ready"], ["autonomous"], None)]
    _, edits = run_snapshots(issue())
    assert edits == []


def test_claim_arrives_between_snapshot_and_mutation():
    alias = issue(["autonomous"])
    claimed = issue(["autonomous", "in-progress"])
    _, edits = run_snapshots(alias, claimed, claimed, claimed)
    assert edits == [(["agent:ready"], ["autonomous"], None)]


def test_repaired_body_is_not_demoted_from_stale_snapshot():
    _, edits = run_snapshots(issue(body="bad"), issue(), issue())
    assert edits == []


@pytest.mark.parametrize("latest", [issue(state="CLOSED"), issue(["blocked"]), issue(["in-progress"])])
def test_closed_or_no_longer_ready_issue_is_untouched(latest):
    _, edits = run_snapshots(issue(body="bad"), latest, latest)
    assert edits == []


def test_stop_added_before_normalization_is_preserved():
    alias = issue(["autonomous"])
    stopped = issue(["autonomous", "blocked"])
    _, edits = run_snapshots(alias, stopped, stopped, stopped)
    assert edits[0][0:2] == (["needs-human"], ["autonomous"])


def test_continuously_changing_issue_is_left_for_next_event():
    result, edits = run_snapshots(*[issue(body=str(i)) for i in range(6)])
    assert result == "deferred: issue changed during intake"
    assert edits == []


def test_cli_rechecks_then_edits_only_target_labels(monkeypatch):
    calls = []
    snapshot = issue(["agent:ready", "in-progress"], "invalid")
    def fetch(command, **kwargs):
        calls.append(command)
        return json.dumps(snapshot)
    monkeypatch.setattr(sys, "argv", ["issue_quality.py", "--issue-number", "202"])
    monkeypatch.setattr(issue_quality.subprocess, "check_output", fetch)
    monkeypatch.setattr(issue_quality.subprocess, "run", lambda command, **kwargs: calls.append(command))
    issue_quality.main()
    assert calls[:2] == [["gh", "issue", "view", "202", "--json", "body,labels,state"]] * 2
    assert calls[2] == ["gh", "issue", "edit", "202", "--add-label", "needs-human",
                        "--remove-label", "agent:ready"]
    assert calls[3][:4] == ["gh", "issue", "comment", "202"]
