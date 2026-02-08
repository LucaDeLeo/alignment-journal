# ATDD Checklist: Story 6.1 - Reviewer Payment Calculation and Display

## AC1: PaymentCalculator renders as collapsible footer
- [ ] PaymentCalculator renders below the resizable split panels in the review workspace
- [ ] Collapsed state shows dollar sign icon, "Estimated Compensation", and total formatted as currency
- [ ] Clicking the bar toggles between collapsed and expanded states
- [ ] Bar has a subtle top border and background to distinguish from main content

## AC2: Expanded view shows line-item breakdown
- [ ] Base Pay line: "$100 + $20 x [N] pages = $[amount]"
- [ ] Quality Multiplier line: "[1x standard | 2x excellent] = $[amount]" or "Pending editor assessment"
- [ ] Speed Bonus line: "$100 x [N] weeks early = $[amount]" with countdown
- [ ] Abstract Bonus line: "$300" if applicable, "Not applicable" if no assignment
- [ ] Total line: bold, larger text with the sum
- [ ] Each line item has label on left and calculated value on right

## AC3: Counting-up animation on expand
- [ ] Line item dollar values animate from $0 to computed value over ~600ms
- [ ] Total value also animates with counting-up effect
- [ ] Animation uses requestAnimationFrame for smooth 60fps
- [ ] Animation replays on subsequent collapse/expand cycles

## AC4: Payment calculation computed in Convex query
- [ ] `getPaymentBreakdown` query exists in `convex/payments.ts`
- [ ] Query reads from payments record, reviews table, and reviewerAbstracts table
- [ ] No payment processing occurs (display-only FR46)
- [ ] Graceful defaults when no payments record exists (pageCount from PDF size or 15, standard quality)
- [ ] Query uses `withReviewer` for authorization
- [ ] Both `args` and `returns` validators defined

## AC5: Speed bonus countdown
- [ ] Speed bonus shows countdown: "N days until 4-week deadline"
- [ ] Deadline computed as review creation date + 28 days
- [ ] Submitted reviews lock speed bonus to value at submission time
- [ ] Past deadline shows "$0 -- deadline passed"
- [ ] Weeks early computed as full weeks between submission date and deadline

## AC6: Abstract bonus detection
- [ ] Shows "$300" when reviewerAbstracts record exists for this reviewer/submission
- [ ] Shows "Not applicable" in muted text when no abstract assignment
- [ ] Reactively updates when abstract is assigned during session

## AC7: Responsive to data changes
- [ ] Values update reactively via Convex subscriptions
- [ ] No page refresh needed
- [ ] Total recalculates automatically on data change

## Unit Tests
- [ ] Payment formula: base pay = $100 + $20 * pageCount
- [ ] Payment formula: quality multiplier 1x standard, 2x excellent applied to base only
- [ ] Payment formula: speed bonus = $100 * weeksEarly
- [ ] Payment formula: abstract bonus = $300 when assigned, $0 when not
- [ ] Payment formula: total = (basePay * qualityMultiplier) + speedBonus + abstractBonus
- [ ] Default page count estimation from PDF file size (1 page per 3000 bytes)
- [ ] Default page count fallback to 15 when no data available
- [ ] Weeks early computation for submitted review
- [ ] Weeks early computation for in-progress review
- [ ] Zero speed bonus when deadline has passed
- [ ] Payment constants exported correctly
