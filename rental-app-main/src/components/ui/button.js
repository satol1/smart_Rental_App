import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
            outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
            filter: "h-8 px-3 rounded-full border border-gray-300 text-gray-700 data-[state=on]:bg-sky-600 data-[state=on]:text-white hover:bg-sky-100 hover:text-gray-900 transition-colors",
            // Обновленные варианты для состояний оборудования в соответствии с изображением
            conditionExcellent: // Великолепно (светло-зеленый фон, темный текст)
            "bg-green-200 text-green-800 shadow-sm hover:bg-green-300 focus-visible:ring-green-400",
            conditionGreat: // Отлично (светло-голубой фон, темный текст)
            "bg-sky-200 text-sky-800 shadow-sm hover:bg-sky-300 focus-visible:ring-sky-400",
            conditionGood: // Хорошо (светло-желтый фон, темный текст)
            "bg-yellow-200 text-yellow-800 shadow-sm hover:bg-yellow-300 focus-visible:ring-yellow-400",
            conditionSatisfactory: // Удовлетворительно (светло-оранжевый/персиковый фон, темный текст)
            "bg-orange-200 text-orange-800 shadow-sm hover:bg-orange-300 focus-visible:ring-orange-400",
            conditionBad: // Плохо / Требует ремонта (светло-красный/розовый фон, темный текст)
            "bg-red-200 text-red-800 shadow-sm hover:bg-red-300 focus-visible:ring-red-400",
        },
        size: {
            default: "h-9 px-4 py-2",
            sm: "h-8 rounded-md px-3 text-xs",
            lg: "h-10 rounded-md px-8",
            icon: "h-9 w-9",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (_jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref: ref, ...props }));
});
Button.displayName = "Button";
export { Button, buttonVariants };
