import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium leading-5 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        destructive: "border-transparent bg-danger-soft text-destructive",
        outline: "border-border bg-transparent text-muted-foreground",
        pastelSky: "border-transparent bg-info-soft text-pastel-sky-fg",
        pastelMint: "border-transparent bg-success-soft text-success",
        pastelAmber: "border-transparent bg-warning-soft text-warning",
        pastelCoral: "border-transparent bg-danger-soft text-destructive",
        pastelLavender: "border-transparent bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
