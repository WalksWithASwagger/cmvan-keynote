#!/usr/bin/env bash
# Validate that the Cloudflare-side configuration this repo expects is
# actually in place BEFORE trying to deploy. Prints a checklist; exits
# non-zero if anything required is missing. Safe to run repeatedly; it
# never mutates anything.
#
# What it checks:
#   - wrangler is installed and authenticated
#   - the Pages project exists
#   - each worker has its required secrets bound
#   - each worker's KV namespace binding is wired up in wrangler.toml
#
# Use as a CI gate, or run manually before ./scripts/deploy-preview.sh.

set -uo pipefail

PROJECT_NAME="punkrockai"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

FAIL=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$1"; }
miss() { printf '  \033[31mMISS\033[0m %s\n' "$1"; FAIL=1; }

section() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# -- 1. wrangler ------------------------------------------------------------
section "wrangler"

if ! command -v wrangler >/dev/null 2>&1; then
  miss "wrangler not on PATH (npm i -g wrangler)"
else
  ok "wrangler $(wrangler --version 2>/dev/null | head -1)"
fi

if [[ $FAIL -eq 1 ]]; then
  echo
  echo "wrangler missing — cannot continue"
  exit 1
fi

if ! wrangler whoami >/dev/null 2>&1; then
  miss "wrangler not authenticated (run: wrangler login)"
else
  WHO="$(wrangler whoami 2>/dev/null | grep -E 'email|account' | head -2 | tr '\n' ' ')"
  ok "authenticated: $WHO"
fi

# -- 2. Pages project -------------------------------------------------------
section "Cloudflare Pages project: $PROJECT_NAME"

if wrangler pages project list 2>/dev/null | grep -q "^${PROJECT_NAME}\b"; then
  ok "project '$PROJECT_NAME' exists"
else
  miss "project '$PROJECT_NAME' not found — create it in the dashboard (see DEPLOYMENT.md §1)"
fi

if [[ -f site/_headers ]]; then ok "site/_headers present"; else miss "site/_headers missing"; fi
if [[ -f site/_redirects ]]; then ok "site/_redirects present"; else miss "site/_redirects missing"; fi

if grep -q 'YOUR-WORKERS' site/_redirects 2>/dev/null; then
  warn "site/_redirects still has YOUR-WORKERS placeholders — workers not wired in"
fi

# -- 3. Workers -------------------------------------------------------------
check_worker() {
  local dir="$1"; shift
  local required_secrets=("$@")
  local name
  name="$(basename "$dir")"

  section "worker: $name"

  if [[ ! -f "$dir/wrangler.toml" ]]; then
    miss "$dir/wrangler.toml missing"
    return
  fi

  pushd "$dir" >/dev/null

  # secrets
  local secrets_out
  if ! secrets_out="$(wrangler secret list 2>/dev/null)"; then
    warn "could not list secrets for $name (worker may not be deployed yet)"
  else
    for s in "${required_secrets[@]}"; do
      if printf '%s' "$secrets_out" | grep -q "\"name\": *\"$s\""; then
        ok "secret bound: $s"
      else
        miss "secret missing: $s  (wrangler secret put $s)"
      fi
    done
  fi

  # KV binding (presence in wrangler.toml — actual id existence requires API)
  if grep -qE '^\s*\[\[kv_namespaces\]\]' wrangler.toml; then
    if grep -qE 'id\s*=\s*"<paste id here>"' wrangler.toml; then
      miss "KV namespace placeholder still in $dir/wrangler.toml — paste real id"
    else
      ok "KV namespace block present in wrangler.toml"
    fi
  else
    warn "no [[kv_namespaces]] block in $dir/wrangler.toml — rate limiting disabled"
  fi

  popd >/dev/null
}

check_worker worker/pattern-finder ANTHROPIC_API_KEY
check_worker worker/submissions    NOTION_API_KEY

# -- 4. summary -------------------------------------------------------------
section "summary"

if [[ $FAIL -eq 0 ]]; then
  echo "  all required checks passed."
  exit 0
else
  echo "  one or more required checks failed — see DEPLOYMENT.md to remediate."
  exit 1
fi
