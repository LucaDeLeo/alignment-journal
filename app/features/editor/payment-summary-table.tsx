import { useMutation, useQuery } from 'convex/react'
import { DollarSignIcon } from 'lucide-react'

import { api } from '../../../convex/_generated/api'

import type { Id } from '../../../convex/_generated/dataModel'

import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { formatCurrency } from '~/lib/format-utils'

interface PaymentSummaryTableProps {
  submissionId: Id<'submissions'>
}

function formatReviewStatus(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'submitted':
    case 'locked':
      return 'Submitted'
    case 'assigned':
      return 'Assigned'
    default:
      return status
  }
}

export function PaymentSummaryTable({
  submissionId,
}: PaymentSummaryTableProps) {
  const summary = useQuery(api.payments.getPaymentSummary, { submissionId })
  const setQualityLevel = useMutation(api.payments.setQualityLevel)

  // Loading
  if (summary === undefined) {
    return (
      <section className="mt-8">
        <div className="flex items-center gap-1.5">
          <DollarSignIcon className="size-3.5 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Payment Summary
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-md border bg-muted/30"
            />
          ))}
        </div>
      </section>
    )
  }

  // No reviews — hide section
  if (summary.length === 0) {
    return null
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-1.5">
        <DollarSignIcon className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Payment Summary
        </h2>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Reviewer</th>
              <th className="pb-2 pr-3 font-medium">Base Pay</th>
              <th className="pb-2 pr-3 font-medium">Quality</th>
              <th className="pb-2 pr-3 font-medium">Speed</th>
              <th className="pb-2 pr-3 font-medium">Abstract</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((item) => (
              <tr key={item.reviewerId} className="border-b last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.reviewerName}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {formatReviewStatus(item.reviewStatus)}
                    </Badge>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <div>
                    <span>{formatCurrency(item.basePay)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({item.pageCount} pages)
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <Select
                    value={item.qualityLevel}
                    onValueChange={(value: 'standard' | 'excellent') => {
                      void setQualityLevel({
                        submissionId,
                        reviewerId: item.reviewerId,
                        qualityLevel: value,
                      })
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (1x)</SelectItem>
                      <SelectItem value="excellent">Excellent (2x)</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2.5 pr-3">
                  {item.speedBonus > 0 ? (
                    <div>
                      <span>{formatCurrency(item.speedBonus)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({item.weeksEarly}w early)
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {item.abstractBonus > 0 ? (
                    <span>{formatCurrency(item.abstractBonus)}</span>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </td>
                <td className="py-2.5 text-right font-semibold">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Display-only &mdash; no payment processing
      </p>
    </section>
  )
}
