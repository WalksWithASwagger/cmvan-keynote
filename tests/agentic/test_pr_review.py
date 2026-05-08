import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "agentic"))

from pr_review import review_pr  # noqa: E402

ISSUE_BODY = """## Acceptance Criteria

- [ ] User-visible behavior is fixed.
"""


GOOD_PR_BODY = """## Summary

Fixes the issue.

## Related Issues

Closes #42

## Acceptance Self-Check

- [x] Criteria met.

## Verification

- [x] Tests pass.
"""


def test_pr_review_marks_complete_agent_pr_review_ready():
    result = review_pr(ISSUE_BODY, GOOD_PR_BODY, additions=10, deletions=5, changed_files=2)

    assert result["ok"]
    assert result["verdict"] == "review-ready"
    assert result["linked_issue"] == "42"


def test_pr_review_does_not_merge_or_pass_without_link():
    result = review_pr(ISSUE_BODY, GOOD_PR_BODY.replace("Closes #42", "Refs #42"), 10, 5, 2)

    assert not result["ok"]
    assert result["verdict"] == "needs-human"


def test_pr_review_blocks_large_diff_for_human_attention():
    result = review_pr(ISSUE_BODY, GOOD_PR_BODY, additions=501, deletions=0, changed_files=2)

    assert not result["ok"]
    assert result["within_limits"] is False
