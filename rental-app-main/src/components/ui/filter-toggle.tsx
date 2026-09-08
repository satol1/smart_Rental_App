import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const filterToggleBaseClass = cva(
  "min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
)

// Keep the legacy argument for callers; selection has one consistent meaning.
export function getFilterToggleClass(_color = "sky") {
  void _color
  return cn(
    filterToggleBaseClass(),
    "data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=off]:bg-card data-[state=off]:text-muted-foreground data-[state=off]:hover:bg-muted data-[state=off]:hover:text-foreground"
  )
}
