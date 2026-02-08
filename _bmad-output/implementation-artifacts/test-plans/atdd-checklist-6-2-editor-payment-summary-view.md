# ATDD Checklist: Story 6.2 — Editor Payment Summary View

## AC1: Payment summary table renders in editor submission detail

- [ ] `getPaymentSummary` query returns per-reviewer breakdown array for a submission with reviews
- [ ] `getPaymentSummary` returns empty array when no reviews exist
- [ ] `getPaymentSummary` deduplicates by reviewerId (keeps most recent review)
- [ ] `getPaymentSummary` includes reviewer name and review status
- [ ] `PaymentSummaryTable` renders null (hidden) when no reviews exist
- [ ] `PaymentSummaryTable` renders one row per reviewer with base pay, quality, speed, abstract, and total columns

## AC2: Quality level selector per reviewer

- [ ] Quality selector defaults to "Standard (1x)" when no payments record exists
- [ ] `setQualityLevel` mutation creates new payments record when none exists
- [ ] `setQualityLevel` mutation updates existing payments record
- [ ] `setQualityLevel` enforces editor role authorization
- [ ] Quality change triggers reactive total recalculation via Convex subscription

## AC3: Consistent formula with reviewer-facing calculator

- [ ] `getPaymentSummary` uses `computePaymentBreakdown` for each reviewer (same pure function as reviewer-facing view)
- [ ] Formula verified: total = (basePay * qualityMultiplier) + speedBonus + abstractBonus
- [ ] (Covered by existing unit tests in `convex/__tests__/payments.test.ts`)

## AC4: Payment information is display-only

- [ ] No "Pay" or "Send" buttons in the component
- [ ] Footer displays "Display-only — no payment processing"

## AC5: setQualityLevel creates or updates payments record

- [ ] Creates record with defaults (weeksEarly: 0, hasAbstractBonus: false) when no record exists
- [ ] Patches qualityLevel and updatedAt on existing record
- [ ] Validates submission exists
- [ ] Validates review exists for the reviewer/submission pair

## AC6: Placeholder payment estimates removed from DecisionPanel

- [ ] `getPaymentEstimates` query removed from `convex/decisions.ts`
- [ ] Payment estimates section removed from `DecisionPanel` component
- [ ] `DollarSignIcon` import removed from `DecisionPanel` (unused after removal)
- [ ] No build errors from removal
