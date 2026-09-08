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
function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  if (!value) return fallback;
  // Токены хранятся как "H S% L%" без обёртки hsl()
  return value.startsWith("hsl") ? value : `hsl(${value})`;
}

/**
 * Возвращает массив цветов графиков из CSS-переменных --chart-1..N.
 * Пересчитывается при смене темы (resolvedTheme).
 */
export function useChartColors(count: number = 5): string[] {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  return React.useMemo(() => {
    void resolvedTheme; // зависимость для пересчёта после смены темы
    return Array.from({ length: count }, (_, index) =>
      readCssColor(`--chart-${index + 1}`, FALLBACK_COLORS[index % FALLBACK_COLORS.length]),
    );
  }, [count, resolvedTheme]);
}

/** Цвет осей/подписей — var(--muted-foreground) */
export function useChartAxisColor(): string {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  return React.useMemo(() => {
    void resolvedTheme;
    return readCssColor("--muted-foreground", "hsl(0 0% 45%)");
  }, [resolvedTheme]);
}

/** Цвет сетки — var(--border) */
export function useChartGridColor(): string {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  return React.useMemo(() => {
    void resolvedTheme;
    return readCssColor("--border", "hsl(0 0% 90%)");
  }, [resolvedTheme]);
}

interface ChartContainerProps {
  /** Высота области графика в px */
  height?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Обёртка графика: ResponsiveContainer + фикс высоты.
 * Используйте внутри компоненты recharts (BarChart, PieChart, ...).
 */
export function ChartContainer({
  height = 280,
  className,
  children,
}: ChartContainerProps) {
  return (
    <div
      className={cn("w-full text-muted-foreground", className)}
      style={{ height }}
      data-testid="chart-container"
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Общие пропсы для осей: цвет подписей, мелкий шрифт */
export function useChartAxisProps() {
  const tickColor = useChartAxisColor();
  return React.useMemo(
    () => ({
      tick: { fill: tickColor, fontSize: 12 },
      stroke: "transparent",
    }),
    [tickColor],
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string | number;
  /** Функция форматирования значения */
  formatter?: (value: number | string) => string;
}

/**
 * Тултип графика в стилях темы (bg-popover / border / текст).
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label !== undefined && label !== "" && (
        <p className="mb-1 text-xs font-medium truncate max-w-[220px]">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground truncate max-w-[160px]">
              {item.name}
            </span>
            <span className="ml-auto font-semibold">
              {formatter && item.value !== undefined
                ? formatter(item.value)
                : String(item.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
