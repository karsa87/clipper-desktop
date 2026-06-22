import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary/10 text-primary',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
        success:     'border-success/20 bg-success/10 text-success',
        warning:     'border-warning/20 bg-warning/10 text-warning',
        outline:     'border-border text-foreground',
        muted:       'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Video / clip status → badge variant + label
type AnyStatus = string

const STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant']; dot?: boolean }> = {
  uploaded:     { label: 'Uploaded',     variant: 'secondary', dot: true },
  transcribing: { label: 'Transcribing', variant: 'warning',   dot: true },
  transcribed:  { label: 'Transcribed',  variant: 'success',   dot: true },
  analyzing:    { label: 'Analyzing',    variant: 'warning',   dot: true },
  analyzed:     { label: 'Analyzed',     variant: 'success',   dot: true },
  clipping:     { label: 'Clipping',     variant: 'default',   dot: true },
  completed:    { label: 'Completed',    variant: 'success',   dot: true },
  failed:       { label: 'Failed',       variant: 'destructive', dot: true },
  pending:      { label: 'Pending',      variant: 'muted',     dot: true },
  extracted:    { label: 'Extracted',    variant: 'secondary', dot: true },
  subtitled:    { label: 'Subtitled',    variant: 'default',   dot: true },
  exported:     { label: 'Exported',     variant: 'success',   dot: true },
}

interface StatusBadgeProps { status: AnyStatus; className?: string }

function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'muted' as const, dot: false }
  const isPulsing = ['transcribing', 'analyzing', 'clipping'].includes(status)
  return (
    <Badge variant={cfg.variant} className={cn('font-mono text-[11px]', className)}>
      {cfg.dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full bg-current shrink-0', isPulsing && 'animate-pulse')} />
      )}
      {cfg.label}
    </Badge>
  )
}

function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(score * 100)
  const variant = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'destructive'
  return (
    <Badge variant={variant} className={cn('font-mono tabular-nums', className)}>
      {pct}%
    </Badge>
  )
}

export { Badge, badgeVariants, StatusBadge, ScoreBadge }
