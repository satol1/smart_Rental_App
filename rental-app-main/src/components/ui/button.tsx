// src/components/ui/button.tsx

/* eslint-disable react-refresh/only-export-components -- shadcn-паттерн: cva-варианты экспортируются рядом с компонентом и переиспользуются извне (AdminNavigation) */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonGesture, springs } from "@/lib/motion";

const buttonVariants = cva(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-5 transition-[color,background-color,border-color,text-decoration-color,box-shadow] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait cursor-pointer select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-xs btn-sheen not-disabled:hover:bg-primary-hover not-disabled:active:bg-primary-hover not-disabled:hover:shadow-button",
                destructive: "bg-destructive text-destructive-foreground shadow-xs not-disabled:hover:bg-destructive/90 not-disabled:active:bg-destructive/80 not-disabled:hover:shadow-button",
                outline: "border border-input bg-card text-foreground not-disabled:hover:border-muted-foreground not-disabled:hover:bg-muted not-disabled:active:bg-secondary",
                secondary: "bg-secondary text-secondary-foreground not-disabled:hover:bg-secondary/75 not-disabled:active:bg-muted",
                tonal: "bg-info-soft text-pastel-sky-fg not-disabled:hover:bg-primary/15 not-disabled:active:bg-primary/20",
                ghost: "text-muted-foreground not-disabled:hover:bg-muted not-disabled:hover:text-foreground not-disabled:active:bg-secondary",
                link: "text-primary underline-offset-4 not-disabled:hover:underline",
                filter: "border border-border bg-card text-muted-foreground data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground not-disabled:hover:bg-muted not-disabled:hover:text-foreground",
                conditionExcellent: "bg-success-soft text-success not-disabled:hover:bg-success/15",
                conditionGreat: "bg-info-soft text-pastel-sky-fg not-disabled:hover:bg-primary/15",
                conditionGood: "bg-warning-soft text-warning not-disabled:hover:bg-warning/15",
                conditionSatisfactory: "bg-warning-soft text-warning not-disabled:hover:bg-warning/15",
                conditionBad: "bg-danger-soft text-destructive not-disabled:hover:bg-destructive/15",
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
        const reduceMotion = useReducedMotion() ?? false;
        const interactive = !props.disabled && !reduceMotion;
        const classes = cn(buttonVariants({ variant, size, className }));

        // Slot и motion() несовместимы: asChild рендерится без motion-обёртки,
        // жесты в этом режиме даёт CSS (hover/active-состояния вариантов).
        if (asChild) {
            return <Slot className={classes} ref={ref} {...props} />;
        }

        return (
            <motion.button
                className={classes}
                ref={ref}
                whileHover={interactive ? buttonGesture.whileHover : undefined}
                whileTap={interactive ? buttonGesture.whileTap : undefined}
                transition={interactive ? springs.press : { duration: 0 }}
                {...(props as React.ComponentProps<typeof motion.button>)}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
