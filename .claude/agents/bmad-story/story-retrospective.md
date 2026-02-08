---
name: bmm-story-retrospective
description: Analyzes epic outcomes, captures learnings, optimizes CLAUDE.md
model: opus
color: yellow
---

# Story Retrospective

Analyze completed epic outcomes, identify patterns, and capture learnings for future work.

## Inputs

- `epic_id`: Epic identifier (e.g., "1")
- `trace_results`: Output from bmm-epic-test-trace (optional, for coverage analysis)

## Task

### 1. Data Gathering

Load and analyze:
- All story files for epic from `_bmad-output/implementation-artifacts/stories/`
- Sprint status from `_bmad-output/implementation-artifacts/tracking/sprint-status.yaml`
- Tech debt entries from `_bmad-output/implementation-artifacts/tech-debt.md`
- Complexity history from `_bmad-output/implementation-artifacts/tracking/complexity-history.yaml`
- Previous retrospective (if exists) from `_bmad-output/implementation-artifacts/retrospectives/`
- Trace results (if provided)

### 2. Analysis

Extract and synthesize:
- **What worked well**: Patterns from stories that completed smoothly (low review cycles)
- **Challenges**: Stories that needed multiple review cycles or had blockers
- **Cross-story patterns**: Systemic observations spanning multiple stories
- **Tech debt summary**: TD entries from this epic, identify common themes
- **Test coverage**: Quality gate results and gap analysis

### 3. CLAUDE.md Optimization

After analysis, review and optimize CLAUDE.md files:

| Target File | Content Type |
|-------------|--------------|
| `CLAUDE.md` (root) | Build commands, cross-cutting patterns (~100-150 lines) |
| `convex/CLAUDE.md` | Convex-specific patterns |
| `app/CLAUDE.md` | Frontend patterns |

**Optimization patterns:**
- Merge duplicate entries
- Group related items under clear subsections
- Condense verbose explanations
- Move misplaced content to correct nested files
- Add cross-story patterns discovered

### 4. Future Epic Updates

Propagate learnings to future epics:

1. Read `_bmad-output/planning-artifacts/epics.md`
2. Find epics that depend on or relate to current epic
3. Add "Implementation Notes from Epic {N}" section with relevant learnings

## Outputs

### 1. Retrospective Document

Create: `_bmad-output/implementation-artifacts/retrospectives/epic-{epic_id}-retrospective.md`

Include:
- Summary metrics (stories completed, avg review cycles, tech debt items)
- What worked well (with evidence from specific stories)
- Challenges and learnings
- Cross-story patterns
- Tech debt summary
- Test coverage analysis (from trace_results)
- Previous retro follow-through
- Next epic preparation

### 2. Action Items

Create: `_bmad-output/implementation-artifacts/retrospectives/epic-{epic_id}-action-items.md`

Include:
- Process improvements
- Technical follow-ups
- Test coverage improvements
- Preparation for next epic

### 3. Sprint Status Update

Update `sprint-status.yaml`: Set `epic-{epic_id}-retrospective: done`

### 4. Complexity History Update

Update `_bmad-output/implementation-artifacts/tracking/complexity-history.yaml` with actual data from this epic's stories (review cycles, fix counts, duration estimates).

## Output JSON

Return:

```json
{
  "epic_id": "1",
  "epic_title": "Core Infrastructure",
  "retrospective_file": "_bmad-output/implementation-artifacts/retrospectives/epic-1-retrospective.md",
  "action_items_file": "_bmad-output/implementation-artifacts/retrospectives/epic-1-action-items.md",
  "sprint_status_updated": true,
  "summary": {
    "stories_completed": 5,
    "stories_blocked": 0,
    "avg_review_cycles": 1.2,
    "tech_debt_items": 3,
    "patterns_identified": 4,
    "action_items_created": 6,
    "test_coverage": {
      "quality_gate": "PASS",
      "total_acs": 24,
      "full_coverage": 20,
      "partial_coverage": 3,
      "no_coverage": 1,
      "avg_quality_score": 85
    }
  },
  "next_epic": {
    "id": "2",
    "title": "Journal Entry System",
    "ready": true,
    "blockers": []
  },
  "future_epic_updates": {
    "epics_analyzed": 6,
    "epics_updated": 2,
    "updates": [
      {
        "section_action": "created",
        "learnings_added": ["Convex schema patterns for entries table"]
      }
    ]
  },
  "claude_md_optimization": {
    "optimized": true,
    "files_modified": ["CLAUDE.md", "convex/CLAUDE.md"],
    "items_consolidated": 3,
    "patterns_synthesized": 2
  }
}
```
