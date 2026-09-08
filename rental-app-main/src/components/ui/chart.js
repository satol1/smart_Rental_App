import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ui/chart.tsx
// Переиспользуемая обёртка над recharts.
// Цвета берутся из CSS-переменных темы (--chart-1..5, --muted-foreground, --border)
// через getComputedStyle, поэтому графики работают и в светлой, и в тёмной теме.
import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
const FALLBACK_COLORS = [
    "hsl(12 76% 61%)",
    "hsl(173 58% 39%)",
    "hsl(197 37% 24%)",
    "hsl(43 74% 66%)",
    "hsl(27 87% 67%)",
];
/** Читает HSL-токен из :root (или .dark) и возвращает готовый цвет для recharts */
function readCssColor(variableName, fallback) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return fallback;
    }
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variableName)
        .trim();
    if (!value)
        return fallback;
    // Токены хранятся как "H S% L%" без обёртки hsl()
    return value.startsWith("hsl") ? value : `hsl(${value})`;
}
/**
 * Возвращает массив цветов графиков из CSS-переменных --chart-1..N.
 * Пересчитывается при смене темы (resolvedTheme).
 */
export function useChartColors(count = 5) {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    return React.useMemo(() => {
        void resolvedTheme; // зависимость для пересчёта после смены темы
        return Array.from({ length: count }, (_, index) => readCssColor(`--chart-${index + 1}`, FALLBACK_COLORS[index % FALLBACK_COLORS.length]));
    }, [count, resolvedTheme]);
}
/** Цвет осей/подписей — var(--muted-foreground) */
export function useChartAxisColor() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    return React.useMemo(() => {
        void resolvedTheme;
        return readCssColor("--muted-foreground", "hsl(0 0% 45%)");
    }, [resolvedTheme]);
}
/** Цвет сетки — var(--border) */
export function useChartGridColor() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    return React.useMemo(() => {
        void resolvedTheme;
        return readCssColor("--border", "hsl(0 0% 90%)");
    }, [resolvedTheme]);
}
/**
 * Обёртка графика: ResponsiveContainer + фикс высоты.
 * Используйте внутри компоненты recharts (BarChart, PieChart, ...).
 */
export function ChartContainer({ height = 280, className, children, }) {
    return (_jsx("div", { className: cn("w-full text-muted-foreground", className), style: { height }, "data-testid": "chart-container", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: children }) }));
}
/** Общие пропсы для осей: цвет подписей, мелкий шрифт */
export function useChartAxisProps() {
    const tickColor = useChartAxisColor();
    return React.useMemo(() => ({
        tick: { fill: tickColor, fontSize: 12 },
        stroke: "transparent",
    }), [tickColor]);
}
/**
 * Тултип графика в стилях темы (bg-popover / border / текст).
 */
export function ChartTooltipContent({ active, payload, label, formatter, }) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md", children: [label !== undefined && label !== "" && (_jsx("p", { className: "mb-1 text-xs font-medium truncate max-w-[220px]", children: label })), _jsx("div", { className: "space-y-0.5", children: payload.map((item, index) => (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "h-2.5 w-2.5 shrink-0 rounded-sm", style: { backgroundColor: item.color } }), _jsx("span", { className: "text-muted-foreground truncate max-w-[160px]", children: item.name }), _jsx("span", { className: "ml-auto font-semibold", children: formatter && item.value !== undefined
                                ? formatter(item.value)
                                : String(item.value ?? "") })] }, index))) })] }));
}
