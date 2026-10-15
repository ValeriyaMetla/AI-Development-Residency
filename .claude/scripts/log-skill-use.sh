#!/usr/bin/env bash
# Appends each Skill invocation to .claude/skill-usage.log for a deterministic audit trail.
# Wired as a PostToolUse hook on the Skill tool; receives the hook payload as JSON on stdin.
set -euo pipefail

payload="$(cat)"
project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

skill="$(printf '%s' "$payload" | /usr/bin/python3 -c \
  'import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("skill", "?"))
except Exception:
    print("?")' 2>/dev/null || echo "?")"

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\t%s\n' "$ts" "$skill" >> "$project_dir/.claude/skill-usage.log"
