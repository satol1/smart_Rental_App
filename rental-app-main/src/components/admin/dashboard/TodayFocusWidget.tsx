// src/components/admin/dashboard/TodayFocusWidget.tsx

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Package, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    AlertTriangle
} from "lucide-react";
import { sortPickupsByPriority, sortOverdueRentalsByDays, getTodayDate } from "@/lib/sortingUtils";
import type { PickupReturnItem, OverdueRentalItem } from "@/hooks/admin/useDashboardData";
import FocusItem from "./FocusItem";

interface TodayFocusWidgetProps {
    data: {
        pickups_today: PickupReturnItem[];
        returns_today: PickupReturnItem[];
        overdue_rentals: OverdueRentalItem[];
    };
    isLoading: boolean;
}

export default function TodayFocusWidget({ data, isLoading }: TodayFocusWidgetProps) {
    const navigate = useNavigate();
    
    // Получаем сегодняшнюю дату с обнуленным временем для корректного сравнения
    const today = getTodayDate();

    const handlePickupClick = (item: PickupReturnItem) => {
        navigate('/admin/reservations', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'active' // Показываем активные, чтобы найти нужный
            }
        });
    };

    const handleReturnClick = (item: PickupReturnItem) => {
        navigate('/admin/rentals', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'active'
            }
        });
    };

    const handleOverdueClick = (item: OverdueRentalItem) => {
        navigate('/admin/rentals', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'overdue'
            }
        });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Фокус на сегодня
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const renderPickupItem = (item: PickupReturnItem) => (
        <FocusItem
            key={item.id}
            item={item}
            type="pickup"
            onClick={() => handlePickupClick(item)}
        />
    );

    const renderReturnItem = (item: PickupReturnItem) => (
        <FocusItem
            key={item.id}
            item={item}
            type="return"
            onClick={() => handleReturnClick(item)}
        />
    );

    const renderOverdueItem = (item: OverdueRentalItem) => (
        <FocusItem
            key={item.id}
            item={item}
            type="overdue"
            onClick={() => handleOverdueClick(item)}
        />
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Фокус на сегодня
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Выдачи сегодня */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <ArrowUpCircle className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-sm">Выдачи сегодня</h3>
                        <Badge variant="outline" className="text-xs">
                            {data.pickups_today.length}
                        </Badge>
                    </div>
                    <div className="space-y-2">
                        {data.pickups_today.length > 0 ? (
                            sortPickupsByPriority(data.pickups_today, today).map(renderPickupItem)
                        ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                                Сегодня нет выдач
                            </div>
                        )}
                    </div>
                </div>

                {/* Возвраты сегодня */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <ArrowDownCircle className="w-4 h-4 text-green-600" />
                        <h3 className="font-medium text-sm">Возвраты сегодня</h3>
                        <Badge variant="outline" className="text-xs">
                            {data.returns_today.length}
                        </Badge>
                    </div>
                    <div className="space-y-2">
                        {data.returns_today.length > 0 ? (
                            data.returns_today.map(renderReturnItem)
                        ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                                Сегодня нет возвратов
                            </div>
                        )}
                    </div>
                </div>

                {/* Просроченные аренды */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <h3 className="font-medium text-sm">Просроченные аренды</h3>
                        <Badge variant="outline" className="text-xs">
                            {data.overdue_rentals.length}
                        </Badge>
                    </div>
                    <div className="space-y-2">
                        {data.overdue_rentals.length > 0 ? (
                            sortOverdueRentalsByDays(data.overdue_rentals).map(renderOverdueItem)
                        ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                                Нет просроченных аренд
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
