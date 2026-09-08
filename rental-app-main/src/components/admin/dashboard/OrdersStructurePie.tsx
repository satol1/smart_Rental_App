// src/components/admin/dashboard/OrdersStructurePie.tsx
// Круговая диаграмма структуры заказов на РЕАЛЬНЫХ агрегатах из
// /admin/dashboard-summary (поле kpi). Никаких выдуманных данных.

import { useMemo } from "react";
import { Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { PieChart as PieChartIcon } from "lucide-react";
import type { KpiData } from "@/hooks/admin/useDashboardData";
import { formatNumber } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltipContent,
  useChartColors,
} from "@/components/ui/chart";

interface OrdersStructurePieProps {
    kpi: KpiData | undefined;
    isLoading: boolean;
}

interface StructureSlice {
    name: string;
    value: number;
    fill: string;
}

export default function OrdersStructurePie({ kpi, isLoading }: OrdersStructurePieProps) {
    const colors = useChartColors(5);

    const data = useMemo<StructureSlice[]>(() => {
        if (!kpi) return [];
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
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5" />
                        Структура заказов
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SkeletonList count={3} compact columns="single" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Структура заказов
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {total === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        <PieChartIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p>Нет активных заказов</p>
                        <p className="text-xs">Диаграмма появится после первых резервов и аренд</p>
                    </div>
                ) : (
                    <>
                        <ChartContainer height={240}>
                            <PieChart>
                                <Tooltip
                                    content={<ChartTooltipContent formatter={(v) => formatNumber(Number(v), "0")} />}
                                />
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    strokeWidth={0}
                                />
                            </PieChart>
                        </ChartContainer>

                        {/* Легенда с реальными числами */}
                        <div className="space-y-2">
                            {data.map((item) => (
                                <div key={item.name} className="flex items-center gap-2 text-sm">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                        style={{ backgroundColor: item.fill }}
                                    />
                                    <span className="text-muted-foreground">{item.name}</span>
                                    <span className="ml-auto font-semibold text-foreground">
                                        {formatNumber(item.value, "0")}
                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                            ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
