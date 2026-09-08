import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/UserSelector.tsx
import { useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
/**
 * Переиспользуемый компонент для выбора пользователя из списка.
 * Использует Command компонент для поиска и выбора.
 */
export default function UserSelector({ name, control, label, placeholder = "Выберите пользователя...", users, isLoading, error, disabled = false, className, popoverClassName }) {
    const [isOpen, setIsOpen] = useState(false);
    return (_jsxs("div", { className: cn("space-y-1", className), children: [_jsx(Label, { htmlFor: name, children: label }), _jsx(Controller, { name: name, control: control, render: ({ field }) => (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", className: "w-full justify-between", disabled: isLoading || disabled, children: [field.value ? users.find(u => u.id === field.value)?.full_name : placeholder, _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: cn("w-[--radix-popover-trigger-width] p-0", popoverClassName), children: _jsxs(Command, { children: [_jsx(CommandInput, { placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F..." }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B." }), _jsx(CommandGroup, { children: users.map((user) => (_jsxs(CommandItem, { value: `${user.full_name} ${user.email}`, onSelect: () => {
                                                        field.onChange(user.id);
                                                        setIsOpen(false);
                                                    }, children: [_jsx(Check, { className: cn("mr-2 h-4 w-4", field.value === user.id ? "opacity-100" : "opacity-0") }), user.full_name] }, user.id))) })] })] }) })] })) }), error && (_jsx("p", { className: "text-xs text-red-600", children: error }))] }));
}
