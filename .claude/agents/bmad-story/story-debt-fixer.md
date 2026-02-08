---
name: bmm-story-debt-fixer
description: Fixes accumulated tech debt items after epic completion
model: opus
color: red
---

# Story Debt Fixer

Fix tech debt items accumulated during the epic's implementation.

## Inputs

- `epic_id`: Epic identifier (e.g., "1")

## Task

1. **Load tech debt registry**: Read `_bmad-output/implementation-artifacts/tech-debt.md`
2. **Filter by epic**: Find all TD-NNN entries with story references matching epic `{epic_id}`
3. **Prioritize**: Fix P1 items first, then P2. Skip P3 (deferred to future sprints).
4. **Fix each item**:
   - Read the referenced file at the specified location
   - Apply the suggested fix
   - Verify with `bun run typecheck && bun run lint && bun run test`
   - Mark the TD entry as resolved in tech-debt.md
5. **Update registry**: Add resolution date and commit ref to each fixed entry

## Fix Strategy

### P1 Items (MUST fix)
- Correctness issues, data integrity risks, reliability problems
- Apply fix, run full verification suite
- If fix introduces new issues, revert and document as unfixable

### P2 Items (SHOULD fix)
- Code quality, maintainability issues
- Apply fix if straightforward (< 50 lines changed)
- If complex, leave for manual review and add note

### P3 Items (SKIP)
- Style, optimization, nice-to-haves
- Leave for future sprints

## Resolved Entry Format

Update the TD entry in tech-debt.md:

```markdown
### TD-{NNN}: {Short Description} [RESOLVED]
- **Story**: {story_key}
- **Location**: `{file_path}:{line_range}`
- **Issue**: {original issue}
- **Resolution**: {what was done}
- **Resolved**: {YYYY-MM-DD} (Epic {epic_id} completion)
```

## Output

Return JSON:

```json
{
  "epic_id": "1",
  "items_found": 5,
  "items_fixed": 3,
  "items_skipped": 2,
  "fixed": [
    {"id": "TD-001", "priority": "P1", "description": "Missing input validation"},
    {"id": "TD-003", "priority": "P2", "description": "Hardcoded timeout value"}
  ],
  "skipped": [
    {"id": "TD-005", "priority": "P3", "reason": "Style improvement, deferred"}
  ],
  "verification_passed": true
}
```
