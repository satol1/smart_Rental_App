import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/layout/ThemeSwitcher.tsx
// Переключатель темы в хедере: Светлое / Тёмное / Системное.
// Построен на существующем Radix Popover из ui/ (dropdown-menu в проекте отсутствует).
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
const THEME_OPTIONS = [
    { value: "light", labelKey: "nav.themeLight", icon: Sun },
    { value: "dark", labelKey: "nav.themeDark", icon: Moon },
    { value: "system", labelKey: "nav.themeSystem", icon: Monitor },
];
export default function ThemeSwitcher() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const theme = useThemeStore((s) => s.theme);
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    const setTheme = useThemeStore((s) => s.setTheme);
    const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;
    const handleSelect = (next) => {
        setTheme(next);
        setIsOpen(false);
    };
    return (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-10 w-10 text-gray-600 hover:text-sky-700", "aria-label": t("nav.themeLabel", { theme: t(THEME_OPTIONS.find((o) => o.value === theme)?.labelKey ?? "nav.themeSystem") }), title: t("nav.themeTitle"), children: _jsx(ActiveIcon, { className: "h-5 w-5" }) }) }), _jsx(PopoverContent, { className: "w-48 p-1", align: "end", children: _jsx("div", { className: "space-y-0.5", children: THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
                        const isActive = theme === value;
                        return (_jsxs("button", { type: "button", onClick: () => handleSelect(value), "aria-pressed": isActive, className: cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors", "hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "font-medium text-foreground" : "text-muted-foreground"), children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Icon, { className: "h-4 w-4", "aria-hidden": "true" }), t(labelKey)] }), isActive && _jsx(Check, { className: "h-4 w-4 text-sky-600" })] }, value));
                    }) }) })] }));
}
