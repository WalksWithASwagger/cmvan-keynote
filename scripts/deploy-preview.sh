#!/usr/bin/env bash
# Deploy site/ to Cloudflare Pages, out-of-band from the Git-driven flow.
#
# Defaults to a preview deployment (does NOT touch punkrockai.com).
# Pass --production to ship a production deploy.
#
# Requires: wrangler >= 3.x, `wrangler login` once on this machine.
#
# Examples:
#   ./scripts/deploy-preview.sh
#   ./scripts/deploy-preview.sh --production
#   ./scripts/deploy-preview.sh --branch hotfix-broken-link

set -euo pipefail

PROJECT_NAME="punkrockai"
SITE_DIR="site"
BRANCH=""
PRODUCTION=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production|--prod)
      PRODUCTION=1
      shift
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "fatal: $SITE_DIR/ not found at $REPO_ROOT" >&2
  exit 1
fi

if ! command -v wrangler >/dev/null 2>&1; then
  echo "fatal: wrangler not on PATH. install with: npm i -g wrangler" >&2
  exit 1
fi

ARGS=(pages deploy "$SITE_DIR" --project-name="$PROJECT_NAME")

if [[ $PRODUCTION -eq 1 ]]; then
  ARGS+=(--branch=main)
  echo ">> deploying $SITE_DIR/ to PRODUCTION on project $PROJECT_NAME"
else
  if [[ -z "$BRANCH" ]]; then
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  fi
  ARGS+=(--branch="$BRANCH")
  echo ">> deploying $SITE_DIR/ as preview (branch: $BRANCH) on project $PROJECT_NAME"
fi

exec wrangler "${ARGS[@]}"
