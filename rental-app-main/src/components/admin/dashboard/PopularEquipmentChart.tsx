// src/components/admin/dashboard/PopularEquipmentChart.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package } from "lucide-react";
import type { PopularEquipmentItem } from "@/hooks/admin/useDashboardData";
import { formatNumber } from "@/lib/utils";

interface PopularEquipmentChartProps {
    data: PopularEquipmentItem[];
    isLoading: boolean;
}

export default function PopularEquipmentChart({ data, isLoading }: PopularEquipmentChartProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Популярное оборудование
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ))}
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
                    <div className="text-center py-8 text-sm text-gray-500">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Нет данных для построения графика</p>
                        <p className="text-xs">Данные появятся после первых аренд</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Сортируем данные по количеству аренд (по убыванию)
    const sortedData = [...data].sort((a, b) => (b.rental_count || 0) - (a.rental_count || 0));
    
    // Берем топ-12 для отображения
    const topData = sortedData.slice(0, 12);
    
    // Добавляем fallback ID для элементов без equipment_id
    const dataWithIds = topData.map((item, index) => ({
        ...item,
        equipment_id: item.equipment_id || `fallback-${index}`
    }));
    
    
    // Находим максимальное значение для нормализации
    const maxRentals = topData.length > 0 ? Math.max(...topData.map(item => item.rental_count || 0)) : 0;


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
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Всего аренд</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(totalRentals, "0")}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-600">Выручка</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(totalRevenue, "0")} ₽
                        </div>
                    </div>
                </div>

                {/* График */}
                <div className="space-y-4">
                    {dataWithIds.map((item, index) => (
                        <div key={item.equipment_id} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                        {item.equipment_name}
                                    </span>
                                    {index < 3 && (
                                        <Badge 
                                            variant={index === 0 ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            #{index + 1}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {formatNumber(item.rental_count, "0")}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatNumber(item.revenue, "0")} ₽
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-out ${
                                            index === 0 
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                                : index === 1 
                                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                                : index === 2
                                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                                : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                        }`}
                                        style={{ width: `${maxRentals > 0 ? ((item.rental_count || 0) / maxRentals) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-medium text-white mix-blend-difference">
                                        {maxRentals > 0 ? (((item.rental_count || 0) / maxRentals) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Дополнительная информация */}
                {data.length > 12 && (
                    <div className="text-center text-sm text-gray-500 pt-2 border-t">
                        Показаны топ-12 из {data.length} позиций
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
