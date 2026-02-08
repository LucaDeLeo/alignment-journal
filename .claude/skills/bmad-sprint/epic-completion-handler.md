# Epic Completion Handler

Documents the 4-step epic completion sequence run when all stories in an epic are done.

## Sequence

When `all_stories_done(epic_id)` returns true, the sprint loop runs a single Claude session with all 4 agents in sequence:

### Step 1: Debt Fixer (`bmm-story-debt-fixer`)
- Reads tech-debt.md for entries from this epic
- Fixes P1 and P2 items
- Runs verification after each fix
- Marks fixed entries as [RESOLVED]

### Step 2: Test Trace (`bmm-epic-test-trace`)
- Builds traceability matrix: AC -> test evidence
- Applies quality gate (PASS/CONCERNS/FAIL)
- Writes trace file to `_bmad-output/implementation-artifacts/traceability/`

### Step 3: Retrospective (`bmm-story-retrospective`)
- Analyzes all story files, review cycles, tech debt patterns
- Creates retrospective document and action items
- Optimizes CLAUDE.md files
- Updates complexity history for future predictions
- Propagates learnings to future epic definitions

### Step 4: Docs Updater (`bmm-docs-updater`)
- Reviews retrospective findings
- Updates planning artifacts (PRD, architecture, epics, UX spec) if needed
- Creates docs-update report

## Checkpoint Format

The sprint loop saves a checkpoint before running:

```yaml
### epic-{N}-completion Checkpoint
- timestamp: {ISO-8601}
- git_ref: {short-hash}
- session: epic-completion
```

## Commit

After all 4 steps complete, the sprint loop commits:
```
chore(epic-{N}): complete epic - debt fixes, traceability, retrospective
```

## Error Handling

If epic completion fails:
- Sprint continues to next epic's stories (non-fatal)
- Warning logged to SPRINT.md
- Can be re-run manually later
