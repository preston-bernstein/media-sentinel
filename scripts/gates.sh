#!/usr/bin/env bash
# Runs every pack gate once. The pre-commit hook and CI call this script, so they cannot drift apart.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

for gate in core gha js ts pg writing; do
  bash "scripts/${gate}-validate.sh"
done
