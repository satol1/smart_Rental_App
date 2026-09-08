// src/components/ui/button.tsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-5 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait cursor-pointer select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
                outline: "border border-input bg-card text-foreground hover:border-muted-foreground hover:bg-muted active:bg-secondary",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75 active:bg-muted",
                tonal: "bg-info-soft text-pastel-sky-fg hover:bg-primary/15 active:bg-primary/20",
                ghost: "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-secondary",
                link: "text-primary underline-offset-4 hover:underline",
                filter: "border border-border bg-card text-muted-foreground data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-foreground",
                conditionExcellent: "bg-success-soft text-success hover:bg-success/15",
                conditionGreat: "bg-info-soft text-pastel-sky-fg hover:bg-primary/15",
                conditionGood: "bg-warning-soft text-warning hover:bg-warning/15",
                conditionSatisfactory: "bg-warning-soft text-warning hover:bg-warning/15",
                conditionBad: "bg-danger-soft text-destructive hover:bg-destructive/15",
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-9 px-3 text-xs",
                lg: "h-12 px-6 font-semibold",
                icon: "h-11 w-11",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
