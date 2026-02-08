---
name: bmm-epic-test-trace
description: Generates traceability matrix and quality gate for epic completion
model: opus
color: magenta
---

# Epic Test Trace

Generate a traceability matrix mapping acceptance criteria to test evidence, then apply quality gate.

## Inputs

- `epic_id`: Epic identifier (e.g., "1")

## Workflow Reference

Execute the BMAD testarch-trace workflow:

```
_bmad/tea/workflows/testarch/trace/
├── workflow.yaml      # Workflow configuration
├── instructions.md    # Full execution logic
├── checklist.md       # Quality validation
└── trace-template.md  # Output template
```

**Load and execute:** `_bmad/tea/workflows/testarch/trace/instructions.md`

## Task

1. **Load all stories for epic**: Read `_bmad-output/implementation-artifacts/tracking/sprint-status.yaml`, find all stories with epic prefix `{epic_id}-*`
2. **Load story files**: Read each story from `_bmad-output/implementation-artifacts/stories/`
3. **Extract ACs**: Parse acceptance criteria from each story
4. **Find test evidence**: Search test files for each AC's test coverage
5. **Build traceability matrix**: Map AC -> test file:test_name -> pass/fail status
6. **Apply quality gate**: Score coverage and determine PASS/CONCERNS/FAIL

## Quality Gate Thresholds

| Rating | Criteria |
|--------|----------|
| **PASS** | >= 80% ACs have FULL coverage, no P0 gaps |
| **CONCERNS** | >= 60% ACs have FULL coverage, no more than 2 P0 gaps |
| **FAIL** | < 60% coverage OR > 2 P0 gaps |

## Gap Priority

- **P0**: Security, data integrity, or core functionality AC without tests
- **P1**: Important business logic AC with only partial coverage
- **P2**: Nice-to-have or edge case AC without full coverage

## Output Location

Create: `_bmad-output/implementation-artifacts/traceability/epic-{epic_id}-trace.md`

## Output

Return JSON:

```json
{
  "epic_id": "1",
  "quality_gate": "PASS",
  "total_acs": 24,
  "coverage_summary": {
    "full": 20,
    "partial": 3,
    "none": 1
  },
  "gaps_by_priority": {
    "P0": [],
    "P1": ["1-3-auth: AC2 - only unit test, no E2E"],
    "P2": ["1-1-init: AC4 - no negative test case"]
  },
  "trace_file": "_bmad-output/implementation-artifacts/traceability/epic-1-trace.md",
  "stories_analyzed": 5,
  "test_files_scanned": 12
}
```

**Required fields:**
- `quality_gate`: `"PASS"` | `"CONCERNS"` | `"FAIL"`
- `coverage_summary`: Counts of FULL/PARTIAL/NONE coverage
- `gaps_by_priority`: Specific gaps organized by priority
- `trace_file`: Path to generated traceability matrix
