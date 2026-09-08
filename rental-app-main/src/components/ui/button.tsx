// src/components/ui/button.tsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow",
                destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
                outline: "border border-input bg-background shadow-xs hover:bg-accent/70 hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
                ghost: "hover:bg-accent/70 hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                filter: "h-8 px-3 rounded-full border border-border/80 text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-accent hover:text-foreground transition-all",

                // Пастельные варианты состояний оборудования
                conditionExcellent: // Великолепно
                    "bg-pastel-mint text-pastel-mint-fg border border-emerald-200/60 shadow-xs hover:bg-emerald-100/80 focus-visible:ring-emerald-400",
                conditionGreat: // Отлично
                    "bg-pastel-sky text-pastel-sky-fg border border-sky-200/60 shadow-xs hover:bg-sky-100/80 focus-visible:ring-sky-400",
                conditionGood: // Хорошо
                    "bg-pastel-amber text-pastel-amber-fg border border-amber-200/60 shadow-xs hover:bg-amber-100/80 focus-visible:ring-amber-400",
                conditionSatisfactory: // Удовлетворительно
                    "bg-orange-50 text-orange-800 border border-orange-200/60 shadow-xs hover:bg-orange-100/80 focus-visible:ring-orange-400",
                conditionBad: // Плохо / Требует ремонта
                    "bg-pastel-coral text-pastel-coral-fg border border-red-200/60 shadow-xs hover:bg-red-100/80 focus-visible:ring-red-400",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-lg px-3 text-xs",
                lg: "h-10 rounded-xl px-6 font-semibold",
                icon: "h-9 w-9 rounded-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
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