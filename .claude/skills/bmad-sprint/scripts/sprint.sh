#!/bin/bash
# sprint.sh - BMAD Sprint: Story-based autonomous execution with Codex validation
#
# Usage:
#   /bmad:sprint [--epic N] [--story KEY] [--yolo] [--skip-codex] [--resume]
#
# Examples:
#   /bmad:sprint --epic 1 --yolo       # All stories in epic 1, AFK mode
#   /bmad:sprint --story 1-1-init      # Single story, interactive
#   /bmad:sprint --resume              # Resume interrupted sprint

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/sprint-helpers.sh"

# ═══════════════════════════════════════════════════════════════
# ARGUMENT PARSING
# ═══════════════════════════════════════════════════════════════

EPIC_FILTER=""
STORY_FILTER=""
YOLO_MODE=false
SKIP_CODEX=false
RESUME_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --epic)
      EPIC_FILTER="$2"
      shift 2
      ;;
    --story)
      STORY_FILTER="$2"
      shift 2
      ;;
    --yolo)
      YOLO_MODE=true
      shift
      ;;
    --skip-codex)
      SKIP_CODEX=true
      shift
      ;;
    --resume)
      RESUME_MODE=true
      shift
      ;;
    --help|-h)
      echo "Usage: /bmad:sprint [options]"
      echo ""
      echo "Options:"
      echo "  --epic N        Run stories for epic N only"
      echo "  --story KEY     Run a single story (e.g., 1-1-init-project)"
      echo "  --yolo          AFK mode - auto-continue, use defaults"
      echo "  --skip-codex    Skip Codex validation"
      echo "  --resume        Resume interrupted sprint"
      echo ""
      echo "Examples:"
      echo "  /bmad:sprint --epic 1 --yolo          All epic 1 stories, AFK"
      echo "  /bmad:sprint --story 1-1-init          Single story"
      echo "  /bmad:sprint --yolo                    All stories, AFK"
      echo "  /bmad:sprint --resume                  Resume"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# ═══════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════

check_git_state || { echo "ERROR: Git state invalid"; exit 1; }
check_sprint_status_exists || { echo "ERROR: sprint-status.yaml not found. Run /bmad-bmm-sprint-planning first."; exit 1; }

# ═══════════════════════════════════════════════════════════════
# INITIALIZE OR RESUME
# ═══════════════════════════════════════════════════════════════

if [[ "$RESUME_MODE" == true ]]; then
  load_sprint_state || exit 1
  STORY_FILTER=$(get_sprint_field "current_story")
  MODE=$(get_sprint_field "mode")
  [[ "$MODE" == "yolo" ]] && YOLO_MODE=true
  EPIC_FILTER=$(get_sprint_field "epic_filter")
  echo "Resuming from story $STORY_FILTER"
else
  check_no_active_sprint || exit 1

  MODE="interactive"
  [[ "$YOLO_MODE" == true ]] && MODE="yolo"
  init_sprint "$EPIC_FILTER" "$STORY_FILTER" "$MODE"
fi

# Build story queue
STORY_QUEUE=$(build_story_queue "$EPIC_FILTER" "$STORY_FILTER") || { echo "ERROR: $STORY_QUEUE"; exit 1; }
STORY_COUNT=$(echo "$STORY_QUEUE" | wc -l | tr -d ' ')

AGENTS_DIR=".claude/agents/bmad-story"

# ═══════════════════════════════════════════════════════════════
# MAIN BANNER
# ═══════════════════════════════════════════════════════════════

echo ""
echo "================================================================"
echo "BMAD SPRINT"
echo "Stories: $STORY_COUNT"
echo "Mode: $([ "$YOLO_MODE" == true ] && echo 'AFK (yolo)' || echo 'Interactive')"
echo "Codex: $([ "$SKIP_CODEX" == true ] && echo 'Disabled' || echo 'Enabled')"
[[ -n "$EPIC_FILTER" ]] && echo "Epic: $EPIC_FILTER"
[[ -n "$STORY_FILTER" ]] && echo "Story: $STORY_FILTER"
echo "================================================================"

# ═══════════════════════════════════════════════════════════════
# STORY LOOP
# ═══════════════════════════════════════════════════════════════

STORY_INDEX=0
LAST_EPIC_ID=""

while IFS= read -r STORY_KEY; do
  STORY_INDEX=$((STORY_INDEX + 1))
  EPIC_ID=$(get_epic_id "$STORY_KEY")

  echo ""
  echo "----------------------------------------------------------------"
  echo "STORY $STORY_INDEX/$STORY_COUNT: $STORY_KEY"
  echo "----------------------------------------------------------------"

  update_sprint_field "current_story" "$STORY_KEY"
  update_sprint_field "status" "running"
  STORY_START=$(date +%s)

  # ─────────────────────────────────────────────────────────────
  # SESSION 1: CREATE + VALIDATE
  # ─────────────────────────────────────────────────────────────

  echo "-> Session 1: Create + Validate"
  update_sprint_field "current_session" "session1"
  create_checkpoint "$STORY_KEY" "session1"

  STORY_FILE="$STORIES_DIR/${STORY_KEY}.md"

  # Skip creation if story file already exists (resume case)
  if [[ ! -f "$STORY_FILE" ]]; then
    # Build prompt combining creator and validator
    PROMPT=$(build_prompt "$AGENTS_DIR/story-creator.md" \
      "story_key=$STORY_KEY" \
      "epic_id=$EPIC_ID" \
      "stories_dir=$STORIES_DIR" \
      "tracking_dir=$TRACKING_DIR")

    PROMPT+="

After creating the story, spawn the validator sub-agent inline:

$(sed '1,/^---$/{ /^---$/!d; /^---$/d; }' "$AGENTS_DIR/story-validator.md" | sed '1,/^---$/d')

Variables for validator:
- story_key=$STORY_KEY
- story_file_path=$STORY_FILE

If validation returns NEEDS_FIXES, fix the issues and re-validate (max 3 cycles).
When story is created and validated: [STORY:SESSION1_COMPLETE]
If validation has blocking issues after 3 fix cycles: [STORY:VALIDATE_FAILED] {issues} [/VALIDATE_FAILED]
"

    run_claude_streaming "$PROMPT"
    SESSION1_RESULT=$?

    case $SESSION1_RESULT in
      0)
        echo ""
        echo "OK Session 1 complete"
        ;;
      1)
        halt_sprint "Error in session 1 for $STORY_KEY"
        extract_error_details "$(get_stream_output)"
        exit 1
        ;;
      2)
        halt_sprint "Validation failed for $STORY_KEY after max fix cycles"
        exit 1
        ;;
      3)
        halt_sprint "Story $STORY_KEY blocked - needs human intervention"
        exit 1
        ;;
      4)
        halt_sprint "No signal from Claude in session 1 for $STORY_KEY"
        exit 1
        ;;
    esac
  else
    echo "   Story file exists, skipping creation"
  fi

  # ─────────────────────────────────────────────────────────────
  # CODEX BOUNDARY 1: Spec validation
  # ─────────────────────────────────────────────────────────────

  if [[ "$SKIP_CODEX" != true ]]; then
    echo "-> Codex: Validating story spec..."

    if ! run_codex_fix_loop "story" "$STORY_KEY"; then
      halt_sprint "Codex story validation failed for $STORY_KEY"
      exit 1
    fi
    log_codex_result "$STORY_KEY" "proceed" "spec validation passed"
  fi

  # ─────────────────────────────────────────────────────────────
  # SESSION 2: TEST-PLAN + IMPLEMENT
  # ─────────────────────────────────────────────────────────────

  echo "-> Session 2: Test-Plan + Implement"
  update_sprint_field "current_session" "session2"
  create_checkpoint "$STORY_KEY" "session2"

  PROMPT=$(build_prompt "$AGENTS_DIR/story-test-planner.md" \
    "story_key=$STORY_KEY" \
    "story_file_path=$STORY_FILE" \
    "epic_id=$EPIC_ID")

  PROMPT+="

After test planning (ATDD RED phase), proceed to implementation (GREEN phase):

$(sed '1,/^---$/{ /^---$/!d; /^---$/d; }' "$AGENTS_DIR/story-implementer.md" | sed '1,/^---$/d')

Variables for implementer:
- story_key=$STORY_KEY
- story_file_path=$STORY_FILE
- atdd_checklist_path=$TEST_PLANS_DIR/atdd-checklist-${STORY_KEY}.md

Run verification: bun run typecheck && bun run lint && bun run test

When tests planned and implementation complete: [STORY:IMPLEMENT_COMPLETE]
"

  run_claude_streaming "$PROMPT"
  SESSION2_RESULT=$?

  case $SESSION2_RESULT in
    0)
      echo ""
      echo "OK Session 2 complete"
      ;;
    1)
      halt_sprint "Error in session 2 for $STORY_KEY"
      extract_error_details "$(get_stream_output)"
      exit 1
      ;;
    3)
      halt_sprint "Story $STORY_KEY implementation blocked"
      exit 1
      ;;
    4)
      halt_sprint "No signal from Claude in session 2 for $STORY_KEY"
      exit 1
      ;;
    *)
      halt_sprint "Unexpected exit code $SESSION2_RESULT in session 2 for $STORY_KEY"
      exit 1
      ;;
  esac

  # ─────────────────────────────────────────────────────────────
  # CODEX BOUNDARY 2: Code review
  # ─────────────────────────────────────────────────────────────

  if [[ "$SKIP_CODEX" != true ]]; then
    echo "-> Codex: Reviewing code..."

    if ! run_codex_fix_loop "code" "$STORY_KEY"; then
      halt_sprint "Codex code review failed for $STORY_KEY"
      exit 1
    fi
    log_codex_result "$STORY_KEY" "proceed" "code review passed"
  fi

  # ─────────────────────────────────────────────────────────────
  # SESSION 3: TEST-REVIEW + CODE-REVIEW (with retry loop)
  # ─────────────────────────────────────────────────────────────

  REVIEW_CYCLES=0
  MAX_REVIEW_CYCLES=3
  REVIEW_APPROVED=false

  while [[ "$REVIEW_APPROVED" != true ]] && [[ $REVIEW_CYCLES -lt $MAX_REVIEW_CYCLES ]]; do
    REVIEW_CYCLES=$((REVIEW_CYCLES + 1))
    echo "-> Session 3: Test-Review + Code-Review (cycle $REVIEW_CYCLES/$MAX_REVIEW_CYCLES)"
    update_sprint_field "current_session" "session3-cycle$REVIEW_CYCLES"
    create_checkpoint "$STORY_KEY" "session3-cycle$REVIEW_CYCLES"

    PROMPT=$(build_prompt "$AGENTS_DIR/story-test-reviewer.md" \
      "story_key=$STORY_KEY" \
      "story_file_path=$STORY_FILE")

    PROMPT+="

After test review, proceed to code review:

$(sed '1,/^---$/{ /^---$/!d; /^---$/d; }' "$AGENTS_DIR/story-reviewer.md" | sed '1,/^---$/d')

Variables for reviewer:
- story_key=$STORY_KEY
- story_file_path=$STORY_FILE

Knowledge capture targets:
- CLAUDE.md (root) for cross-cutting patterns
- convex/CLAUDE.md for Convex-specific patterns
- app/CLAUDE.md for frontend patterns

Tech debt: _bmad-output/implementation-artifacts/tech-debt.md (TD-NNN format)

If APPROVED or APPROVED_WITH_IMPROVEMENTS: [STORY:REVIEW_APPROVED]
If CHANGES_REQUESTED: [STORY:REVIEW_CHANGES_REQUESTED] {issues} [/STORY:REVIEW_CHANGES_REQUESTED]
"

    run_claude_streaming "$PROMPT"
    SESSION3_RESULT=$?

    case $SESSION3_RESULT in
      0)
        echo ""
        echo "OK Review approved"
        REVIEW_APPROVED=true
        ;;
      1)
        halt_sprint "Error in review session for $STORY_KEY"
        extract_error_details "$(get_stream_output)"
        exit 1
        ;;
      2)
        # Changes requested - loop back to session 2
        echo ""
        echo "WARN Changes requested, looping back to implement (cycle $REVIEW_CYCLES)"
        REVIEW_ISSUES=$(extract_review_issues "$(get_stream_output)")

        # Re-run session 2 with review feedback
        PROMPT=$(build_prompt "$AGENTS_DIR/story-implementer.md" \
          "story_key=$STORY_KEY" \
          "story_file_path=$STORY_FILE" \
          "review_feedback=$REVIEW_ISSUES")

        PROMPT+="
Address ALL review feedback issues listed above.
Run verification: bun run typecheck && bun run lint && bun run test

When fixes complete: [STORY:IMPLEMENT_COMPLETE]
"

        run_claude_streaming "$PROMPT"
        FIX_RESULT=$?

        if [[ $FIX_RESULT -ne 0 ]]; then
          halt_sprint "Failed to fix review issues for $STORY_KEY (code $FIX_RESULT)"
          exit 1
        fi
        echo "OK Fixes applied, re-reviewing..."
        ;;
      3)
        halt_sprint "Review blocked for $STORY_KEY"
        exit 1
        ;;
      4)
        halt_sprint "No signal from Claude in review session for $STORY_KEY"
        exit 1
        ;;
    esac
  done

  if [[ "$REVIEW_APPROVED" != true ]]; then
    halt_sprint "Review not approved after $MAX_REVIEW_CYCLES cycles for $STORY_KEY"
    exit 1
  fi

  # ─────────────────────────────────────────────────────────────
  # COMMIT
  # ─────────────────────────────────────────────────────────────

  echo "-> Committing story $STORY_KEY..."
  update_story_status "$STORY_KEY" "done"
  git add -A && git commit -m "feat($STORY_KEY): implement story

Story: $STORY_KEY
Epic: $EPIC_ID
Review cycles: $REVIEW_CYCLES" 2>/dev/null || echo "   (nothing to commit)"

  # ─────────────────────────────────────────────────────────────
  # STORY COMPLETE
  # ─────────────────────────────────────────────────────────────

  STORY_DURATION=$(($(date +%s) - STORY_START))
  log_story_complete "$STORY_KEY" "$STORY_DURATION"

  echo ""
  echo "OK Story $STORY_KEY complete ($(format_duration $STORY_DURATION))"

  # ─────────────────────────────────────────────────────────────
  # EPIC COMPLETION CHECK
  # ─────────────────────────────────────────────────────────────

  if all_stories_done "$EPIC_ID" && [[ "$EPIC_ID" != "$LAST_EPIC_ID" ]]; then
    LAST_EPIC_ID="$EPIC_ID"
    echo ""
    echo "================================================================"
    echo "EPIC $EPIC_ID COMPLETE - Running completion sequence"
    echo "================================================================"

    update_sprint_field "current_session" "epic-completion"

    PROMPT="## SPRINT MODE: Epic $EPIC_ID Completion

You are running in AUTONOMOUS SPRINT MODE. Follow these rules strictly:

### FORBIDDEN:
- DO NOT use AskUserQuestion
- DO NOT wait for user input

### TASK:
Run the epic completion sequence for Epic $EPIC_ID:

1. **Debt Fixer**: Fix tech debt items for this epic
$(cat "$AGENTS_DIR/story-debt-fixer.md" | sed '1,/^---$/{ /^---$/!d; /^---$/d; }' | sed '1,/^---$/d')

Variables: epic_id=$EPIC_ID

2. **Test Trace**: Generate traceability matrix
$(cat "$AGENTS_DIR/epic-test-trace.md" | sed '1,/^---$/{ /^---$/!d; /^---$/d; }' | sed '1,/^---$/d')

Variables: epic_id=$EPIC_ID

3. **Retrospective**: Analyze epic outcomes
$(cat "$AGENTS_DIR/story-retrospective.md" | sed '1,/^---$/{ /^---$/!d; /^---$/d; }' | sed '1,/^---$/d')

Variables: epic_id=$EPIC_ID

4. **Docs Updater**: Update planning artifacts
$(cat "$AGENTS_DIR/docs-updater.md" | sed '1,/^---$/{ /^---$/!d; /^---$/d; }' | sed '1,/^---$/d')

Variables: epic_id=$EPIC_ID

Run all 4 steps in sequence. Commit results.

When done: [STORY:EPIC_COMPLETE]
If error: [STORY:ERROR] {description} [/ERROR]
"

    run_claude_streaming "$PROMPT"
    EPIC_RESULT=$?

    if [[ $EPIC_RESULT -ne 0 ]]; then
      echo "WARN Epic completion had issues (code $EPIC_RESULT), continuing sprint..."
    else
      # Commit epic completion
      git add -A && git commit -m "chore(epic-$EPIC_ID): complete epic - debt fixes, traceability, retrospective" 2>/dev/null || true
      echo "OK Epic $EPIC_ID completion done"
    fi
  fi

  # ─────────────────────────────────────────────────────────────
  # INTERACTIVE PAUSE
  # ─────────────────────────────────────────────────────────────

  if [[ "$YOLO_MODE" != true ]] && [[ $STORY_INDEX -lt $STORY_COUNT ]]; then
    pause_for_review
  fi

done <<< "$STORY_QUEUE"

# ═══════════════════════════════════════════════════════════════
# SPRINT COMPLETE
# ═══════════════════════════════════════════════════════════════

finalize_sprint
cleanup_stream

echo ""
echo "================================================================"
echo "BMAD SPRINT COMPLETE"
echo "$STORY_COUNT stories executed successfully"
echo "Sprint log: $SPRINT_FILE"
echo "================================================================"
