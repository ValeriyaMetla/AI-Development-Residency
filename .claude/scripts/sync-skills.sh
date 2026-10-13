#!/usr/bin/env bash
#
# sync-skills.sh — mirror this repo's project skills into the user's personal
# skills folder so they are available account-wide in Claude Code (every project
# on this machine), and re-package each skill as an upload-ready .zip for the
# claude.ai / desktop Skills UI.
#
# Runs automatically via the SessionStart hook in .claude/settings.json, and can
# be run by hand at any time:  bash .claude/scripts/sync-skills.sh
#
set -euo pipefail

# Resolve the repo's skills dir (works whether run by the hook or by hand).
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SRC="$REPO_ROOT/.claude/skills"
DEST="$HOME/.claude/skills"
ZIPS="$REPO_ROOT/.claude/skill-zips"

[ -d "$SRC" ] || { echo "sync-skills: no skills dir at $SRC"; exit 0; }
mkdir -p "$DEST" "$ZIPS"

count=0
for dir in "$SRC"/*/; do
  [ -f "${dir}SKILL.md" ] || continue          # only real skills
  name="$(basename "$dir")"

  # 1) Mirror into ~/.claude/skills (adds new, updates changed, prunes removed
  #    files *within this skill only* — never touches other personal skills).
  rsync -a --delete --exclude='.DS_Store' "$dir" "$DEST/$name/"

  # 2) Refresh the upload zip for the claude.ai / desktop Skills UI.
  rm -f "$ZIPS/$name.zip"
  ( cd "$SRC" && zip -q -r -X "$ZIPS/$name.zip" "$name" -x '*.DS_Store' )

  count=$((count + 1))
done

echo "sync-skills: synced $count skill(s) -> $DEST and refreshed zips in $ZIPS"
