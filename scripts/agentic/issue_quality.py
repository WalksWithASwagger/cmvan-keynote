#!/usr/bin/env python3
"""Reconcile intake labels against current issue content, independently of execution."""

import argparse
import json
import subprocess

from common import load_contract, repo_root
from issue_lint import lint_issue


def decision(issue, contract):
    labels = {label["name"] for label in issue["labels"]}
    if issue["state"] != "OPEN":
        return None
    # A runner's claim is not a content defect; execution still checks every stop label.
    result = lint_issue(issue["body"] or "", sorted(labels - {"in-progress"}), contract)
    if not result["ready_seen"]:
        return None
    ready = contract["labels"]["ready"]
    aliases = result["alias_labels"]
    if result["ok"]:
        add = [] if ready in labels else [ready]
        return (add, aliases, None) if add or aliases else None
    remove = sorted(labels & {ready, *contract["labels"].get("ready_aliases", [])})
    return (["needs-human"], remove, "Agentic issue quality gate failed: " + result["message"])


def reconcile(fetch, edit, contract):
    for _ in range(3):
        snapshot = fetch()
        change = decision(snapshot, contract)
        if change is None:
            return "unchanged"
        if fetch() != snapshot:
            continue
        edit(*change)
        return "updated"
    return "deferred: issue changed during intake"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue-number", required=True, type=int)
    args = parser.parse_args()
    number = str(args.issue_number)

    def fetch():
        return json.loads(subprocess.check_output(
            ["gh", "issue", "view", number, "--json", "body,labels,state"], text=True))

    def edit(add, remove, comment):
        command = ["gh", "issue", "edit", number]
        for label in add:
            command += ["--add-label", label]
        for label in remove:
            command += ["--remove-label", label]
        subprocess.run(command, check=True)
        if comment:
            subprocess.run(["gh", "issue", "comment", number, "--body", comment], check=True)

    print(reconcile(fetch, edit, load_contract(repo_root())))


if __name__ == "__main__":
    main()
