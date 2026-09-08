// src/components/admin/dashboard/PopularEquipmentChart.tsx

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package } from "lucide-react";
import type { PopularEquipmentItem } from "@/hooks/admin/useDashboardData";
import { formatNumber } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltipContent,
  useChartAxisProps,
  useChartColors,
  useChartGridColor,
} from "@/components/ui/chart";

interface PopularEquipmentChartProps {
    data: PopularEquipmentItem[];
    isLoading: boolean;
}

export default function PopularEquipmentChart({ data, isLoading }: PopularEquipmentChartProps) {
    const colors = useChartColors(5);
    const gridColor = useChartGridColor();
    const axisProps = useChartAxisProps();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Популярное оборудование
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SkeletonList count={6} compact columns="single" />
                </CardContent>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Популярное оборудование
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p>Нет данных для построения графика</p>
                        <p className="text-xs">Данные появятся после первых аренд</p>
                    </div>
                </CardContent>
            </Card>
        );
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Популярное оборудование
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Сводная статистика */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/60 rounded-lg">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Package className="w-4 h-4 text-chart-1" />
                            <span className="text-sm font-medium text-muted-foreground">Всего аренд</span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(totalRentals, "0")}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-4 h-4 text-chart-2" />
                            <span className="text-sm font-medium text-muted-foreground">Выручка</span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                            {formatNumber(totalRevenue, "0")} ₽
                        </div>
                    </div>
                </div>

                {/* График (recharts): горизонтальные бары, цвета из --chart-N */}
                <ChartContainer height={Math.max(220, chartData.length * 28)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} {...axisProps} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={150}
                            tickLine={false}
                            tick={{ fill: axisProps.tick.fill, fontSize: 11 }}
                            stroke="transparent"
                        />
                        <Tooltip
                            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                            content={<ChartTooltipContent formatter={(v) => `${formatNumber(Number(v), "0")} аренд`} />}
                        />
                        <Bar dataKey="rental_count" name="Аренды" radius={[0, 4, 4, 0]} maxBarSize={20}>
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>

                {/* Топ-3 позиции бейджами */}
                <div className="flex flex-wrap items-center gap-2">
                    {topData.slice(0, 3).map((item, index) => (
                        <Badge key={item.equipment_id ?? index} variant={index === 0 ? "default" : "secondary"} className="text-xs">
                            #{index + 1} {item.equipment_name}
                        </Badge>
                    ))}
                </div>

                {/* Дополнительная информация */}
                {data.length > 12 && (
                    <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                        Показаны топ-12 из {data.length} позиций
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
