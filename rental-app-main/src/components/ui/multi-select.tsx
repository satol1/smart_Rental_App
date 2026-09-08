// src/components/ui/multi-select.tsx

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Command, CommandList, CommandItem } from "@/components/ui/command"; // ✅ ИСПРАВЛЕНО: Убран неиспользуемый CommandGroup
import { Command as CommandPrimitive } from "cmdk";

const multiSelectVariants = cva(
    "m-0 flex flex-wrap gap-1 rounded-md border border-input bg-card p-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
    {
        variants: {
            variant: {
                default: "min-h-11",
                compact: "h-auto min-h-11",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface MultiSelectProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof multiSelectVariants> {
    placeholder?: string;
    options: {
        label: string;
        value: string;
        icon?: React.ReactNode;
    }[];
    value: string[];
    onValueChange: (value: string[]) => void;
    disabled?: boolean;
    maxCount?: number;
}

const MultiSelect = React.forwardRef<
    // ✅ ИСПРАВЛЕНО: Тип ref изменен на HTMLInputElement
    HTMLInputElement,
    MultiSelectProps
>(
    (
        {
            placeholder,
            options,
            value,
            onValueChange,
            disabled,
            variant,
            maxCount: _maxCount = 5,
            className,
            ...props
        },
        ref
    ) => {
        // Retained for compatibility; all selected values remain visible.
        void _maxCount;
        const [open, setOpen] = React.useState(false);
        const [inputValue, setInputValue] = React.useState("");

        const handleSelect = (val: string) => {
            if (!value.includes(val)) {
                onValueChange([...value, val]);
            }
        };

        const handleDeselect = (val: string) => {
            onValueChange(value.filter((v) => v !== val));
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

        return (
            <Command
                onKeyDown={handleKeyDown}
                className="overflow-visible bg-transparent"
            >
                <div className={cn(multiSelectVariants({ variant }), className)}>
                    <div className="flex flex-wrap items-center gap-1">
                        {selected.map((option) => (
                            <Badge
                                key={option.value}
                                variant="secondary"
                                className="gap-1 whitespace-nowrap"
                            >
                                {option.label}
                                <button
                                    type="button"
                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleDeselect(option.value);
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleDeselect(option.value)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        ))}
                        <CommandPrimitive.Input
                            ref={ref}
                            placeholder={selected.length > 0 ? "" : placeholder}
                            className="w-fit flex-1 bg-transparent p-1 outline-none placeholder:text-muted-foreground"
                            value={inputValue}
                            onValueChange={setInputValue}
                            onBlur={() => setOpen(false)}
                            onFocus={() => setOpen(true)}
                            disabled={disabled}
                            {...props}
                        />
                    </div>
                </div>
                <div className="relative mt-2">
                    {open && unselected.length > 0 ? (
                        <div className="absolute top-0 z-10 w-full rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-popover outline-none">
                            <CommandList>
                                {unselected.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onSelect={() => handleSelect(option.value)}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandList>
                        </div>
                    ) : null}
                </div>
            </Command>
        );
    }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };