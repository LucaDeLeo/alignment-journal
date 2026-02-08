#!/bin/bash
# sprint-helpers.sh - State management and validation functions for BMAD Sprint

# Enable nullglob for safe glob handling
shopt -s nullglob

# Paths
TRACKING_DIR="_bmad-output/implementation-artifacts/tracking"
SPRINT_FILE="$TRACKING_DIR/SPRINT.md"
STATUS_FILE="$TRACKING_DIR/sprint-status.yaml"
STORIES_DIR="_bmad-output/implementation-artifacts/stories"
TEST_PLANS_DIR="_bmad-output/implementation-artifacts/test-plans"
TECH_DEBT_FILE="_bmad-output/implementation-artifacts/tech-debt.md"

# Discover skills directory relative to this script
_HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$_HELPERS_DIR/../.." && pwd)"
CODEX_SCRIPT="$_HELPERS_DIR/ask_codex.sh"

# Temp file - initialized lazily
STREAM_OUTPUT_FILE=""

# ═══════════════════════════════════════════════════════════════
# TEMP FILE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

init_temp_file() {
  if [[ -z "$STREAM_OUTPUT_FILE" ]]; then
    STREAM_OUTPUT_FILE=$(mktemp -t bmad-sprint)
    trap 'rm -f "$STREAM_OUTPUT_FILE"' EXIT
  fi
}

# ═══════════════════════════════════════════════════════════════
# SPRINT STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

init_sprint() {
  local EPIC_FILTER=$1
  local STORY_FILTER=$2
  local MODE=${3:-interactive}

  local TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  cat > "$SPRINT_FILE" << EOF
---
started: "$TIMESTAMP"
mode: $MODE
epic_filter: "$EPIC_FILTER"
story_filter: "$STORY_FILTER"
current_story: ""
current_session: ""
status: running
last_action: "Sprint initialized"
halt_reason: null
stories_completed: 0
stories_failed: 0
---

# BMAD Sprint

## Progress

| Story | Status | Duration | Session | Notes |
|-------|--------|----------|---------|-------|

## Checkpoints

*(checkpoint details will be recorded here for resume)*

## Validation History

| Story | Time | Claude | Codex | Outcome |
|-------|------|--------|-------|---------|

EOF

  echo "Sprint initialized ($MODE mode)"
}

get_sprint_field() {
  local FIELD=$1
  grep "^$FIELD:" "$SPRINT_FILE" 2>/dev/null | sed "s/^$FIELD:[[:space:]]*//" | tr -d '"'
}

update_sprint_field() {
  local FIELD=$1
  local VALUE=$2

  # Escape sed special chars in value
  local ESCAPED_VALUE=$(printf '%s' "$VALUE" | sed 's/[&/\]/\\&/g; s/"/\\"/g')

  if grep -q "^$FIELD:" "$SPRINT_FILE" 2>/dev/null; then
    sed -i.bak "s|^$FIELD:.*|$FIELD: $ESCAPED_VALUE|" "$SPRINT_FILE" && rm -f "$SPRINT_FILE.bak"
  fi
}

load_sprint_state() {
  if [[ ! -f "$SPRINT_FILE" ]]; then
    echo "No SPRINT.md found. Cannot resume."
    return 1
  fi

  local STATUS=$(get_sprint_field "status")
  if [[ "$STATUS" == "complete" ]]; then
    echo "Sprint already complete."
    return 1
  fi

  echo "Resuming sprint from story $(get_sprint_field current_story)"
  return 0
}

# ═══════════════════════════════════════════════════════════════
# STORY QUEUE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# Parse sprint-status.yaml and return ordered story keys
# Usage: build_story_queue [--epic N] [--story KEY]
build_story_queue() {
  local EPIC_FILTER="${1:-}"
  local STORY_FILTER="${2:-}"

  if [[ -n "$STORY_FILTER" ]]; then
    echo "$STORY_FILTER"
    return 0
  fi

  if [[ ! -f "$STATUS_FILE" ]]; then
    echo "ERROR: sprint-status.yaml not found at $STATUS_FILE" >&2
    return 1
  fi

  # Extract story keys that are in backlog or ready-for-dev status
  # Format in sprint-status.yaml: "  story-key: status"
  local stories=()
  while IFS= read -r line; do
    # Match lines like "  1-1-init-project: backlog" or "  1-1-init-project: ready-for-dev"
    if echo "$line" | grep -qE '^\s+[0-9]+-[0-9]+-.*:\s*(backlog|ready-for-dev)'; then
      local key=$(echo "$line" | sed 's/^[[:space:]]*//' | cut -d: -f1)

      # Apply epic filter if set
      if [[ -n "$EPIC_FILTER" ]]; then
        local epic_id=$(echo "$key" | cut -d- -f1)
        if [[ "$epic_id" != "$EPIC_FILTER" ]]; then
          continue
        fi
      fi

      stories+=("$key")
    fi
  done < "$STATUS_FILE"

  if [[ ${#stories[@]} -eq 0 ]]; then
    echo "No stories found in queue" >&2
    return 1
  fi

  printf '%s\n' "${stories[@]}"
}

get_story_status() {
  local STORY_KEY=$1
  grep "^\s*$STORY_KEY:" "$STATUS_FILE" 2>/dev/null | sed 's/.*:\s*//' | tr -d ' '
}

update_story_status() {
  local STORY_KEY=$1
  local NEW_STATUS=$2
  sed -i.bak "s|\(\s*$STORY_KEY:\s*\).*|\1$NEW_STATUS|" "$STATUS_FILE" && rm -f "$STATUS_FILE.bak"
}

# Extract epic number from story key ("1-2-foo" -> "1")
get_epic_id() {
  local STORY_KEY=$1
  echo "$STORY_KEY" | cut -d- -f1
}

# Check if all stories for an epic are done
all_stories_done() {
  local EPIC_ID=$1

  # Count total stories for this epic
  local total=$(grep -cE "^\s+${EPIC_ID}-[0-9]+-" "$STATUS_FILE" 2>/dev/null || echo "0")
  # Count done stories
  local done=$(grep -cE "^\s+${EPIC_ID}-[0-9]+-.*:\s*done" "$STATUS_FILE" 2>/dev/null || echo "0")

  [[ "$total" -gt 0 ]] && [[ "$total" -eq "$done" ]]
}

# ═══════════════════════════════════════════════════════════════
# PROMPT BUILDER
# ═══════════════════════════════════════════════════════════════

# Assemble Claude prompt with agent instructions and variables
# Usage: build_prompt AGENT_FILE VAR1=val1 VAR2=val2 ...
build_prompt() {
  local AGENT_FILE=$1
  shift

  # Read agent file (skip frontmatter)
  local AGENT_CONTENT
  AGENT_CONTENT=$(sed '1,/^---$/{ /^---$/!d; /^---$/d; }' "$AGENT_FILE" | sed '1,/^---$/d')

  local PROMPT="## SPRINT MODE: Autonomous Execution

You are running in AUTONOMOUS SPRINT MODE. Follow these rules strictly:

### FORBIDDEN (will break the sprint):
- DO NOT use AskUserQuestion under any circumstances
- DO NOT wait for user response or input
- DO NOT present options and wait for selection
- DO NOT pause for confirmation or approval

### REQUIRED BEHAVIOR:
- Make all decisions autonomously using best judgment
- If blocked on anything: emit error signal, do not wait
- Complete work fully before emitting completion signal

### AGENT INSTRUCTIONS:

$AGENT_CONTENT

### VARIABLES:
"

  # Append variable assignments
  for var in "$@"; do
    PROMPT+="
- $var"
  done

  PROMPT+="

### SIGNALS (output exactly one before exiting):
- [STORY:SESSION1_COMPLETE] - Story created and validated
- [STORY:IMPLEMENT_COMPLETE] - Tests planned and code implemented
- [STORY:REVIEW_APPROVED] - Code review approved
- [STORY:REVIEW_CHANGES_REQUESTED] {issues} [/STORY:REVIEW_CHANGES_REQUESTED] - Review requests changes
- [STORY:EPIC_COMPLETE] - Epic completion done
- [STORY:FIX_COMPLETE] - Codex-driven fix applied
- [STORY:ERROR] {description} [/ERROR] - Unrecoverable error
- [STORY:VALIDATE_FAILED] {issues} [/VALIDATE_FAILED] - Validation blocking issues
- [STORY:BLOCKED] {reason} [/BLOCKED] - Human intervention needed
"

  echo "$PROMPT"
}

# ═══════════════════════════════════════════════════════════════
# CODEX VALIDATION
# ═══════════════════════════════════════════════════════════════

validate_story_with_codex() {
  local STORY_KEY=$1
  local STORY_FILE="$STORIES_DIR/${STORY_KEY}.md"

  if [[ ! -f "$STORY_FILE" ]]; then
    echo "[HALT] Story file not found: $STORY_FILE"
    return 1
  fi

  local PROMPT="Sprint story validation for $STORY_KEY.

Read and review: $STORY_FILE

Check EXACTLY these criteria:
1. Completeness - All acceptance criteria defined with testable conditions?
2. Technical accuracy - Dev Notes reference correct files/APIs/patterns?
3. Task decomposition - Tasks are atomic and ordered correctly?
4. Risks addressed - Known risks have mitigations?

Response format:
- If no issues: [PROCEED]
- If issues found: [HALT] followed by ALL issues, each on its own line"

  bash "$CODEX_SCRIPT" "$PROMPT" gpt-5.3-codex xhigh 300 brief
}

review_code_with_codex() {
  local STORY_KEY=$1

  local COMMITS=$(git log --oneline -15 2>/dev/null | head -15)
  local DIFF_STAT=$(git diff HEAD~15..HEAD --stat 2>/dev/null | tail -20)

  local PROMPT="Sprint code review for story $STORY_KEY.

Recent commits:
$COMMITS

Files changed:
$DIFF_STAT

Check for root issues - be specific with file:line:
1. Logic errors or bugs
2. Security vulnerabilities
3. Missing error handling
4. Code that doesn't achieve stated acceptance criteria

Response format:
- If no issues: [PROCEED]
- If issues found: [HALT] followed by ALL issues, each on its own line with file:line reference"

  bash "$CODEX_SCRIPT" "$PROMPT" gpt-5.3-codex xhigh 300 brief
}

# ═══════════════════════════════════════════════════════════════
# CODEX FIX LOOP
# ═══════════════════════════════════════════════════════════════

# Invoke Claude to fix issues identified by Codex
run_claude_fixer() {
  local TYPE="$1"
  local STORY_KEY="$2"
  local ISSUE="$3"

  local PROMPT="## SPRINT MODE: Fix Issues

AUTONOMOUS MODE - DO NOT use AskUserQuestion. Fix ALL issues directly.

"

  case "$TYPE" in
    story)
      PROMPT+="Fix these issues in the story file for $STORY_KEY:

Story file: $STORIES_DIR/${STORY_KEY}.md

$ISSUE

Read the story, fix ALL issues listed above, keep changes minimal.
Make fixes autonomously - do not ask for clarification.

When done: [STORY:FIX_COMPLETE]"
      ;;
    code)
      PROMPT+="Fix these code issues identified by Codex for story $STORY_KEY:

$ISSUE

Fix ALL issues listed above. Commit with: 'fix: address Codex review feedback for $STORY_KEY'
Make fixes autonomously - do not ask for clarification.

When done: [STORY:FIX_COMPLETE]"
      ;;
  esac

  init_temp_file
  run_claude_streaming "$PROMPT"

  grep -q "\[STORY:FIX_COMPLETE\]" "$STREAM_OUTPUT_FILE" 2>/dev/null
}

# Run Codex validation with Claude fix loop
# Usage: run_codex_fix_loop TYPE STORY_KEY
# Returns: 0=approved, 1=critical/unfixable, 2=max attempts exceeded
run_codex_fix_loop() {
  local TYPE="$1"
  local STORY_KEY="$2"
  local MAX_FIX_ROUNDS=5
  local fix_round=0

  while true; do
    echo "  -> Codex review (round $((fix_round + 1)))..."

    local CODEX_RESULT=""
    case "$TYPE" in
      story)  CODEX_RESULT=$(validate_story_with_codex "$STORY_KEY" 2>&1) ;;
      code)   CODEX_RESULT=$(review_code_with_codex "$STORY_KEY" 2>&1) ;;
    esac

    if echo "$CODEX_RESULT" | grep -q "\[PROCEED\]"; then
      echo "  OK Codex approved"
      return 0
    elif echo "$CODEX_RESULT" | grep -q "\[HALT\]"; then
      if [[ $fix_round -ge $MAX_FIX_ROUNDS ]]; then
        echo "  FAIL Max fix rounds ($MAX_FIX_ROUNDS) exceeded"
        return 2
      fi

      local ISSUES
      ISSUES=$(echo "$CODEX_RESULT" | sed -n '/\[HALT\]/,$p' | sed '1s/.*\[HALT\] *//')
      local ISSUE_COUNT
      ISSUE_COUNT=$(echo "$ISSUES" | grep -c . || echo "1")
      echo "  WARN Found $ISSUE_COUNT issue(s):"
      echo "$ISSUES" | sed 's/^/    /'
      echo "  -> Claude fixer applying fixes..."

      if run_claude_fixer "$TYPE" "$STORY_KEY" "$ISSUES"; then
        echo "  OK Fixes applied, re-reviewing..."
        fix_round=$((fix_round + 1))
      else
        echo "  FAIL Fixer failed"
        return 1
      fi
    else
      # No clear signal - treat as pass
      echo "  OK Codex approved (no issues found)"
      return 0
    fi
  done
}

# ═══════════════════════════════════════════════════════════════
# STREAMING EXECUTION
# ═══════════════════════════════════════════════════════════════

# Run Claude with streaming output - displays in real-time and captures to file
# Usage: run_claude_streaming "prompt"
# Returns: exit code based on signals found
# Output captured in: $STREAM_OUTPUT_FILE
run_claude_streaming() {
  local PROMPT="$1"

  init_temp_file

  # Clear output file
  > "$STREAM_OUTPUT_FILE"

  # Run Claude with stream-json and process output
  claude -p "$PROMPT" --dangerously-skip-permissions --output-format stream-json --verbose 2>&1 | \
  while IFS= read -r line; do
    if echo "$line" | jq -e '.type == "assistant"' &>/dev/null 2>&1; then
      content=$(echo "$line" | jq -r '.message.content[].text // empty' 2>/dev/null)
      if [[ -n "$content" ]]; then
        echo "$content"
        echo "$content" >> "$STREAM_OUTPUT_FILE"
      fi
    elif echo "$line" | jq -e '.type == "result"' &>/dev/null 2>&1; then
      result=$(echo "$line" | jq -r '.result // empty' 2>/dev/null)
      if [[ -n "$result" ]] && [[ ! -s "$STREAM_OUTPUT_FILE" ]]; then
        echo "$result"
        echo "$result" >> "$STREAM_OUTPUT_FILE"
      fi
    fi
  done

  check_signals "$(cat "$STREAM_OUTPUT_FILE" 2>/dev/null)"
  return $?
}

get_stream_output() {
  cat "$STREAM_OUTPUT_FILE" 2>/dev/null
}

cleanup_stream() {
  rm -f "$STREAM_OUTPUT_FILE"
}

# ═══════════════════════════════════════════════════════════════
# SIGNAL HANDLING
# ═══════════════════════════════════════════════════════════════

check_signals() {
  local OUTPUT="$1"

  # Success signals (exit 0)
  if echo "$OUTPUT" | grep -q "\[STORY:SESSION1_COMPLETE\]"; then return 0; fi
  if echo "$OUTPUT" | grep -q "\[STORY:IMPLEMENT_COMPLETE\]"; then return 0; fi
  if echo "$OUTPUT" | grep -q "\[STORY:REVIEW_APPROVED\]"; then return 0; fi
  if echo "$OUTPUT" | grep -q "\[STORY:EPIC_COMPLETE\]"; then return 0; fi
  if echo "$OUTPUT" | grep -q "\[STORY:FIX_COMPLETE\]"; then return 0; fi

  # Error signal (exit 1)
  if echo "$OUTPUT" | grep -q "\[STORY:ERROR\]"; then return 1; fi

  # Validation/review issues (exit 2)
  if echo "$OUTPUT" | grep -q "\[STORY:VALIDATE_FAILED\]"; then return 2; fi
  if echo "$OUTPUT" | grep -q "\[STORY:REVIEW_CHANGES_REQUESTED\]"; then return 2; fi

  # Blocked - needs human (exit 3)
  if echo "$OUTPUT" | grep -q "\[STORY:BLOCKED\]"; then return 3; fi

  # No signal found (exit 4)
  return 4
}

extract_error_details() {
  local OUTPUT="$1"
  echo "$OUTPUT" | sed -n '/\[STORY:ERROR\]/,/\[\/ERROR\]/p' | head -10
}

extract_review_issues() {
  local OUTPUT="$1"
  echo "$OUTPUT" | sed -n '/\[STORY:REVIEW_CHANGES_REQUESTED\]/,/\[\/STORY:REVIEW_CHANGES_REQUESTED\]/p' | head -20
}

# ═══════════════════════════════════════════════════════════════
# CHECKPOINT/RESUME
# ═══════════════════════════════════════════════════════════════

create_checkpoint() {
  local STORY_KEY=$1
  local SESSION=$2
  local TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local GIT_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

  cat >> "$SPRINT_FILE" << EOF

### $STORY_KEY - $SESSION Checkpoint
- timestamp: $TIMESTAMP
- git_ref: $GIT_REF
- session: $SESSION
EOF
}

# ═══════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════

log_story_complete() {
  local STORY_KEY=$1
  local DURATION=$2

  # Update progress table
  echo "| $STORY_KEY | complete | $(format_duration $DURATION) | all | - |" >> "$SPRINT_FILE"

  local COMPLETED=$(get_sprint_field "stories_completed")
  update_sprint_field "stories_completed" "$((COMPLETED + 1))"
  update_sprint_field "last_action" "Story $STORY_KEY completed"
}

log_codex_result() {
  local STORY_KEY=$1
  local OUTCOME=$2
  local RESULT=$3
  local TIMESTAMP=$(date +"%H:%M")

  local SAFE_RESULT=$(echo "$RESULT" | tr '|\n' '  ' | cut -c1-50)
  echo "| $STORY_KEY | $TIMESTAMP | passed | $OUTCOME | $SAFE_RESULT |" >> "$SPRINT_FILE"
}

halt_sprint() {
  local REASON=$1

  update_sprint_field "status" "halted"
  update_sprint_field "halt_reason" "\"$REASON\""

  # Write failure report
  local REPORT_FILE="$TRACKING_DIR/failure-report-$(date +%Y%m%d-%H%M%S).md"
  cat > "$REPORT_FILE" << EOF
# Sprint Failure Report

**Time**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Story**: $(get_sprint_field "current_story")
**Session**: $(get_sprint_field "current_session")
**Reason**: $REASON
**Git Ref**: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

## Last Output

$(get_stream_output | tail -50)
EOF

  echo ""
  echo "================================================================"
  echo "SPRINT HALTED"
  echo "Reason: $REASON"
  echo "Report: $REPORT_FILE"
  echo "Resume with: /bmad:sprint --resume"
  echo "================================================================"
}

finalize_sprint() {
  update_sprint_field "status" "complete"
  update_sprint_field "last_action" "Sprint completed successfully"
}

# ═══════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════

check_git_state() {
  if ! git rev-parse --git-dir &>/dev/null; then
    echo "Not a git repository"
    return 1
  fi

  if git ls-files -u | grep -q .; then
    echo "Git has unresolved merge conflicts"
    return 1
  fi

  return 0
}

check_sprint_status_exists() {
  [[ -f "$STATUS_FILE" ]]
}

check_no_active_sprint() {
  if [[ -f "$SPRINT_FILE" ]]; then
    local STATUS=$(get_sprint_field "status")
    if [[ "$STATUS" == "running" ]]; then
      echo "Sprint already running. Use --resume or delete SPRINT.md"
      return 1
    fi
  fi
  return 0
}

# ═══════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════

format_duration() {
  local SECONDS=$1
  local MINUTES=$((SECONDS / 60))
  local SECS=$((SECONDS % 60))

  if [[ $MINUTES -gt 0 ]]; then
    echo "${MINUTES}m ${SECS}s"
  else
    echo "${SECS}s"
  fi
}

pause_for_review() {
  echo ""
  read -r -p "Continue to next story? [Y/n/halt] " response
  case "$response" in
    n|N|halt|HALT)
      halt_sprint "User requested pause"
      exit 0
      ;;
  esac
}
