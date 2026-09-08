import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline: "border-border text-foreground bg-background/50",
        pastelSky:
          "bg-pastel-sky text-pastel-sky-fg border-sky-200/60 hover:bg-sky-100/80",
        pastelMint:
          "bg-pastel-mint text-pastel-mint-fg border-emerald-200/60 hover:bg-emerald-100/80",
        pastelAmber:
          "bg-pastel-amber text-pastel-amber-fg border-amber-200/60 hover:bg-amber-100/80",
        pastelCoral:
          "bg-pastel-coral text-pastel-coral-fg border-red-200/60 hover:bg-red-100/80",
        pastelLavender:
          "bg-pastel-lavender text-pastel-lavender-fg border-purple-200/60 hover:bg-purple-100/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
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
