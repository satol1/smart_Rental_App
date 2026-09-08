import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/dashboard/OrdersStructurePie.tsx
// Круговая диаграмма структуры заказов на РЕАЛЬНЫХ агрегатах из
// /admin/dashboard-summary (поле kpi). Никаких выдуманных данных.
import { useMemo } from "react";
import { Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { ChartContainer, ChartTooltipContent, useChartColors, } from "@/components/ui/chart";
export default function OrdersStructurePie({ kpi, isLoading }) {
    const colors = useChartColors(5);
    const data = useMemo(() => {
        if (!kpi)
            return [];
        // Только реальные агрегаты бэкенда, без домыслов.
        // overdue_rentals — ПОДМНОЖЕСТВО active_rentals (status=ACTIVE + end<today):
        // сегменты делаем непересекающимися, иначе доли в круге завышены
        const activeRentals = kpi.active_rentals ?? 0;
        const overdueRentals = kpi.overdue_rentals ?? 0;
        const onTimeRentals = Math.max(0, activeRentals - overdueRentals);
        return [
            { name: "Активные резервы", value: kpi.active_reservations ?? 0, fill: colors[0] },
            { name: "Аренды в срок", value: onTimeRentals, fill: colors[1] },
            { name: "Просроченные аренды", value: overdueRentals, fill: colors[4] },
        ];
    }, [kpi, colors]);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (isLoading) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(PieChartIcon, { className: "w-5 h-5" }), "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0437\u0430\u043A\u0430\u0437\u043E\u0432"] }) }), _jsx(CardContent, { children: _jsx(SkeletonList, { count: 3, compact: true, className: "grid-cols-1" }) })] }));
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(PieChartIcon, { className: "w-5 h-5" }), "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0437\u0430\u043A\u0430\u0437\u043E\u0432"] }) }), _jsx(CardContent, { className: "space-y-4", children: total === 0 ? (_jsxs("div", { className: "text-center py-8 text-sm text-muted-foreground", children: [_jsx(PieChartIcon, { className: "w-8 h-8 mx-auto mb-2 text-muted-foreground" }), _jsx("p", { children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u043A\u0430\u0437\u043E\u0432" }), _jsx("p", { className: "text-xs", children: "\u0414\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u044B\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432 \u0438 \u0430\u0440\u0435\u043D\u0434" })] })) : (_jsxs(_Fragment, { children: [_jsx(ChartContainer, { height: 240, children: _jsxs(PieChart, { children: [_jsx(Tooltip, { content: _jsx(ChartTooltipContent, { formatter: (v) => formatNumber(Number(v), "0") }) }), _jsx(Pie, { data: data, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", innerRadius: 55, outerRadius: 90, paddingAngle: 2, strokeWidth: 0 })] }) }), _jsx("div", { className: "space-y-2", children: data.map((item) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "h-2.5 w-2.5 shrink-0 rounded-sm", style: { backgroundColor: item.fill } }), _jsx("span", { className: "text-muted-foreground", children: item.name }), _jsxs("span", { className: "ml-auto font-semibold text-foreground", children: [formatNumber(item.value, "0"), _jsxs("span", { className: "ml-1 text-xs font-normal text-muted-foreground", children: ["(", total > 0 ? ((item.value / total) * 100).toFixed(0) : 0, "%)"] })] })] }, item.name))) })] })) })] }));
}
