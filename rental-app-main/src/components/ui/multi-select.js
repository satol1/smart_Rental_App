// src/components/ui/multi-select.tsx
"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandList, CommandItem } from "@/components/ui/command"; // ✅ ИСПРАВЛЕНО: Убран неиспользуемый CommandGroup
import { Command as CommandPrimitive } from "cmdk";
const multiSelectVariants = cva("m-0 flex flex-wrap gap-1 rounded-md border border-input bg-background p-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", {
    variants: {
        variant: {
            default: "h-10",
            compact: "h-auto min-h-10",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
const MultiSelect = React.forwardRef(({ placeholder, options, value, onValueChange, disabled, variant, maxCount = 5, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const handleSelect = (val) => {
        if (!value.includes(val)) {
            onValueChange([...value, val]);
        }
    };
    const handleDeselect = (val) => {
        onValueChange(value.filter((v) => v !== val));
    };
    const handleKeyDown = (e) => {
        const input = e.currentTarget.querySelector("input");
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && value.length > 0) {
                    handleDeselect(value[value.length - 1]);
                }
            }
            if (e.key === "Escape") {
                input.blur();
            }
        }
    };
    const selected = options.filter((opt) => value.includes(opt.value));
    const unselected = options.filter((opt) => !value.includes(opt.value));
    return (_jsxs(Command, { onKeyDown: handleKeyDown, className: "overflow-visible bg-transparent", children: [_jsx("div", { className: cn(multiSelectVariants({ variant }), className), children: _jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [selected.map((option) => (_jsxs(Badge, { variant: "secondary", className: "gap-1 whitespace-nowrap", children: [option.label, _jsx("button", { type: "button", className: "ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2", onKeyDown: (e) => {
                                        if (e.key === "Enter")
                                            handleDeselect(option.value);
                                    }, onMouseDown: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }, onClick: () => handleDeselect(option.value), children: _jsx(X, { className: "h-3 w-3 text-muted-foreground hover:text-foreground" }) })] }, option.value))), _jsx(CommandPrimitive.Input, { ref: ref, placeholder: selected.length > 0 ? "" : placeholder, className: "w-fit flex-1 bg-transparent p-1 outline-none placeholder:text-muted-foreground", value: inputValue, onValueChange: setInputValue, onBlur: () => setOpen(false), onFocus: () => setOpen(true), disabled: disabled, ...props })] }) }), _jsx("div", { className: "relative mt-2", children: open && unselected.length > 0 ? (_jsx("div", { className: "absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in", children: _jsx(CommandList, { children: unselected.map((option) => (_jsx(CommandItem, { onMouseDown: (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }, onSelect: () => handleSelect(option.value), className: "cursor-pointer", children: option.label }, option.value))) }) })) : null })] }));
});
MultiSelect.displayName = "MultiSelect";
export { MultiSelect };
