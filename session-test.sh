#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="frontend-design"
TEST_DIR="/tmp/asd-session-test"
SKILL_PATH="$TEST_DIR/.opencode/skills/$SKILL_NAME/SKILL.md"
LOG_FILE="/tmp/asd-session-test.log"

rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "test dir : $TEST_DIR"
echo "skill    : $SKILL_NAME (exists on skills.sh, not in superpowers)"
echo ""

echo "[1/3] running opencode session..."
opencode run \
  --dir "$TEST_DIR" \
  --dangerously-skip-permissions \
  "Use the skill tool to load the skill named \"$SKILL_NAME\". Report what happened." \
  2>&1 | tee "$LOG_FILE"

echo ""
echo "[2/3] verifying disk..."
if [ -f "$SKILL_PATH" ]; then
  SIZE=$(wc -c < "$SKILL_PATH")
  echo "PASS  $SKILL_PATH exists (${SIZE} bytes)"
else
  echo "FAIL  $SKILL_PATH not found"
  exit 1
fi

echo ""
echo "[3/3] verifying content..."
if grep -qi "$SKILL_NAME" "$SKILL_PATH"; then
  echo "PASS  SKILL.md contains expected skill name"
else
  echo "FAIL  SKILL.md content looks wrong"
  head -5 "$SKILL_PATH"
  exit 1
fi

echo ""
echo "ALL CHECKS PASSED"
