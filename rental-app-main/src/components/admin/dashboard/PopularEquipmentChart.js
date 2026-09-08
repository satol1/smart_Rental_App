import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/dashboard/PopularEquipmentChart.tsx
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis, Tooltip, } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ChartContainer, ChartTooltipContent, useChartAxisProps, useChartColors, useChartGridColor, } from "@/components/ui/chart";
export default function PopularEquipmentChart({ data, isLoading }) {
    const colors = useChartColors(5);
    const gridColor = useChartGridColor();
    const axisProps = useChartAxisProps();
    if (isLoading) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(BarChart3, { className: "w-5 h-5" }), "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435"] }) }), _jsx(CardContent, { children: _jsx(SkeletonList, { count: 6, compact: true, className: "grid-cols-1" }) })] }));
    }
    if (data.length === 0) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(BarChart3, { className: "w-5 h-5" }), "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435"] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "text-center py-8 text-sm text-muted-foreground", children: [_jsx(BarChart3, { className: "w-8 h-8 mx-auto mb-2 text-muted-foreground" }), _jsx("p", { children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F \u0433\u0440\u0430\u0444\u0438\u043A\u0430" }), _jsx("p", { className: "text-xs", children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u044B\u0445 \u0430\u0440\u0435\u043D\u0434" })] }) })] }));
    }
    // Сортируем по количеству аренд (по убыванию), топ-12
    const sortedData = [...data].sort((a, b) => (b.rental_count || 0) - (a.rental_count || 0));
    const topData = sortedData.slice(0, 12);
    // Для горизонтального бара: топ-1 сверху → reverse для XAxis
    const chartData = [...topData]
        .reverse()
        .map((item, index) => ({
        name: item.equipment_name,
        rental_count: item.rental_count || 0,
        revenue: item.revenue || 0,
        // Цвета идут от самого популярного (после reverse — с конца)
        fill: colors[(topData.length - 1 - index) % colors.length],
    }));
    const totalRentals = data.reduce((sum, item) => sum + (item.rental_count || 0), 0);
    const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(BarChart3, { className: "w-5 h-5" }), "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435"] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 p-4 bg-muted/60 rounded-lg", children: [_jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center gap-1 mb-1", children: [_jsx(Package, { className: "w-4 h-4 text-chart-1" }), _jsx("span", { className: "text-sm font-medium text-muted-foreground", children: "\u0412\u0441\u0435\u0433\u043E \u0430\u0440\u0435\u043D\u0434" })] }), _jsx("div", { className: "text-2xl font-bold text-foreground", children: formatNumber(totalRentals, "0") })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center gap-1 mb-1", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-chart-2" }), _jsx("span", { className: "text-sm font-medium text-muted-foreground", children: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430" })] }), _jsxs("div", { className: "text-2xl font-bold text-foreground", children: [formatNumber(totalRevenue, "0"), " \u20BD"] })] })] }), _jsx(ChartContainer, { height: Math.max(220, chartData.length * 28), children: _jsxs(BarChart, { data: chartData, layout: "vertical", margin: { top: 0, right: 16, bottom: 0, left: 8 }, children: [_jsx(CartesianGrid, { horizontal: false, stroke: gridColor, strokeDasharray: "3 3" }), _jsx(XAxis, { type: "number", allowDecimals: false, ...axisProps }), _jsx(YAxis, { type: "category", dataKey: "name", width: 150, tickLine: false, tick: { fill: axisProps.tick.fill, fontSize: 11 }, stroke: "transparent" }), _jsx(Tooltip, { cursor: { fill: "hsl(var(--muted) / 0.4)" }, content: _jsx(ChartTooltipContent, { formatter: (v) => `${formatNumber(Number(v), "0")} аренд` }) }), _jsx(Bar, { dataKey: "rental_count", name: "\u0410\u0440\u0435\u043D\u0434\u044B", radius: [0, 4, 4, 0], maxBarSize: 20, children: chartData.map((entry) => (_jsx(Cell, { fill: entry.fill }, entry.name))) })] }) }), _jsx("div", { className: "flex flex-wrap items-center gap-2", children: topData.slice(0, 3).map((item, index) => (_jsxs(Badge, { variant: index === 0 ? "default" : "secondary", className: "text-xs", children: ["#", index + 1, " ", item.equipment_name] }, item.equipment_id ?? index))) }), data.length > 12 && (_jsxs("div", { className: "text-center text-sm text-muted-foreground pt-2 border-t", children: ["\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0442\u043E\u043F-12 \u0438\u0437 ", data.length, " \u043F\u043E\u0437\u0438\u0446\u0438\u0439"] }))] })] }));
}
