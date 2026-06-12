#!/usr/bin/env bash
set -euo pipefail

state_file="docs/IMPLEMENTATION_STATE.md"

if [[ ! -f "$state_file" ]]; then
  echo "Missing $state_file"
  exit 1
fi

awk '
  /^## Current Status/ { in_status=1; print; next }
  in_status && /^## / { in_status=0 }
  in_status { print }
  /^## Next (Step|Action)/ { in_next=1; print; next }
  in_next && /^## / { exit }
  in_next { print }
' "$state_file"
