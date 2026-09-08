// src/pages/admin/DashboardPage.tsx

import { useCurrentUser } from "@/hooks/useProfile";
import { useDashboardData } from "@/hooks/admin/useDashboardData";
import AdminNavigation from "@/components/admin/AdminNavigation";
import TodayFocusWidget from "@/components/admin/dashboard/TodayFocusWidget";
import KpiCardsWidget from "@/components/admin/dashboard/KpiCardsWidget";
import ActivityFeedWidget from "@/components/admin/dashboard/ActivityFeedWidget";
import PopularEquipmentChart from "@/components/admin/dashboard/PopularEquipmentChart";
import OrdersStructurePie from "@/components/admin/dashboard/OrdersStructurePie";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { data: currentUser } = useCurrentUser();
    const { data: dashboardData, isLoading, isError, error, refetch } = useDashboardData();

    const isAdmin = currentUser?.role === "admin";
    const isManager = currentUser?.role === "manager" || isAdmin;

    if (!isManager) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-6">
                <AdminNavigation />
                <div className="flex items-center justify-center min-h-[400px]">
                    <Alert className="max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Доступ ограничен. Требуются права менеджера или администратора.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <AdminNavigation />
                <div className="flex items-center justify-center min-h-[400px]">
                    <Card className="max-w-md">
                        <CardContent className="pt-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="mt-2">
                                    <div className="font-medium mb-2">Ошибка загрузки данных</div>
                                    <div className="text-sm text-muted-foreground mb-4">
                                        {error?.message || "Не удалось загрузить данные дашборда"}
                                    </div>
                                    <Button 
                                        onClick={() => refetch()} 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Попробовать снова
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />

            {/* Заголовок */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Панель управления
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Добро пожаловать, {currentUser?.full_name}!
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Обновление...
                        </div>
                    )}
                    <Button 
                        onClick={() => refetch()} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Блок KPI теперь не в гриде, а сам по себе */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <KpiCardsWidget 
                    data={dashboardData?.kpi || {
                        total_users: 0,
                        active_users: 0,
                        total_equipment: 0,
                        total_reservations: 0,
                        revenue_today: 0,
                        revenue_this_month: 0,
                        occupancy_rate: 0,
                        avg_rental_duration: 0,
                        // +++ НОВЫЕ ПОЛЯ +++
                        active_reservations: 0,
                        total_rentals: 0,
                        active_rentals: 0,
                        overdue_rentals: 0,
                        total_accessories: 0,
                        total_associations: 0
                    }} 
                    isLoading={false} 
                />
            )}

            {/* Блок "Фокус на сегодня" на всю ширину */}
            <div className="w-full">
                {isLoading ? (
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-32" />
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <TodayFocusWidget 
                        data={{
                            pickups_today: dashboardData?.pickups_today || [],
                            returns_today: dashboardData?.returns_today || [],
                            overdue_rentals: dashboardData?.overdue_rentals || []
                        }} 
                        isLoading={false} 
                    />
                )}
            </div>
            
            {/* Новый грид для оставшихся блоков */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeedWidget
                    data={dashboardData?.recent_activity || []}
                    isLoading={isLoading}
                />
                {/* График на реальных агрегатах API (поле kpi) */}
                <OrdersStructurePie
                    kpi={dashboardData?.kpi}
                    isLoading={isLoading}
                />
            </div>

            <PopularEquipmentChart
                data={dashboardData?.popular_equipment || []}
                isLoading={isLoading}
            />

            {/* Дополнительная информация */}
            {!isLoading && dashboardData && (
                <div className="text-center text-sm text-gray-500 pt-4 border-t">
                    <p>
                        Данные обновляются автоматически каждые 2 минуты. 
                        Последнее обновление: {new Date().toLocaleTimeString('ru-RU')}
                    </p>
                </div>
            )}
        </div>
    );
}
