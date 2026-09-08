import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6", children: [_jsx(AdminNavigation, {}), _jsx("div", { className: "flex items-center justify-center min-h-[400px]", children: _jsxs(Alert, { className: "max-w-md", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "\u0414\u043E\u0441\u0442\u0443\u043F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D. \u0422\u0440\u0435\u0431\u0443\u044E\u0442\u0441\u044F \u043F\u0440\u0430\u0432\u0430 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430 \u0438\u043B\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430." })] }) })] }));
    }
    if (isError) {
        return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsx("div", { className: "flex items-center justify-center min-h-[400px]", children: _jsx(Card, { className: "max-w-md", children: _jsx(CardContent, { className: "pt-6", children: _jsxs(Alert, { variant: "destructive", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsxs(AlertDescription, { className: "mt-2", children: [_jsx("div", { className: "font-medium mb-2", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445" }), _jsx("div", { className: "text-sm text-muted-foreground mb-4", children: error?.message || "Не удалось загрузить данные дашборда" }), _jsxs(Button, { onClick: () => refetch(), variant: "outline", size: "sm", className: "w-full", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430"] })] })] }) }) }) })] }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u041F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F" }), _jsxs("p", { className: "text-gray-600 mt-1", children: ["\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C, ", currentUser?.full_name, "!"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [isLoading && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }), "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435..."] })), _jsxs(Button, { onClick: () => refetch(), variant: "outline", size: "sm", disabled: isLoading, children: [_jsx(RefreshCw, { className: `w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}` }), "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"] })] })] }), isLoading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: Array.from({ length: 4 }).map((_, index) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-20" }), _jsx(Skeleton, { className: "h-8 w-16" }), _jsx(Skeleton, { className: "h-3 w-24" })] }) }) }, index))) })) : (_jsx(KpiCardsWidget, { data: dashboardData?.kpi || {
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
                }, isLoading: false })), _jsx("div", { className: "w-full", children: isLoading ? (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-6 w-32" }), Array.from({ length: 3 }).map((_, index) => (_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-24" }), _jsx(Skeleton, { className: "h-16 w-full" })] }, index)))] }) }) })) : (_jsx(TodayFocusWidget, { data: {
                        pickups_today: dashboardData?.pickups_today || [],
                        returns_today: dashboardData?.returns_today || [],
                        overdue_rentals: dashboardData?.overdue_rentals || []
                    }, isLoading: false })) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(ActivityFeedWidget, { data: dashboardData?.recent_activity || [], isLoading: isLoading }), _jsx(OrdersStructurePie, { kpi: dashboardData?.kpi, isLoading: isLoading })] }), _jsx(PopularEquipmentChart, { data: dashboardData?.popular_equipment || [], isLoading: isLoading }), !isLoading && dashboardData && (_jsx("div", { className: "text-center text-sm text-gray-500 pt-4 border-t", children: _jsxs("p", { children: ["\u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043A\u0430\u0436\u0434\u044B\u0435 2 \u043C\u0438\u043D\u0443\u0442\u044B. \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435: ", new Date().toLocaleTimeString('ru-RU')] }) }))] }));
}
