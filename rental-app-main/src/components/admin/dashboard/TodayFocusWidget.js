import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/dashboard/TodayFocusWidget.tsx
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { sortPickupsByPriority, sortOverdueRentalsByDays, getTodayDate } from "@/lib/sortingUtils";
import FocusItem from "./FocusItem";
export default function TodayFocusWidget({ data, isLoading }) {
    const navigate = useNavigate();
    // Получаем сегодняшнюю дату с обнуленным временем для корректного сравнения
    const today = getTodayDate();
    const handlePickupClick = (item) => {
        navigate('/admin/reservations', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'active' // Показываем активные, чтобы найти нужный
            }
        });
    };
    const handleReturnClick = (item) => {
        navigate('/admin/rentals', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'active'
            }
        });
    };
    const handleOverdueClick = (item) => {
        navigate('/admin/rentals', {
            state: {
                highlightId: item.id,
                from: 'calendar', // Указываем контекст перехода
                statusFilterOverride: 'overdue'
            }
        });
    };
    if (isLoading) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5" }), "\u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-24" }), _jsx(Skeleton, { className: "h-16 w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-24" }), _jsx(Skeleton, { className: "h-16 w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-24" }), _jsx(Skeleton, { className: "h-16 w-full" })] })] })] }));
    }
    const renderPickupItem = (item) => (_jsx(FocusItem, { item: item, type: "pickup", onClick: () => handlePickupClick(item) }, item.id));
    const renderReturnItem = (item) => (_jsx(FocusItem, { item: item, type: "return", onClick: () => handleReturnClick(item) }, item.id));
    const renderOverdueItem = (item) => (_jsx(FocusItem, { item: item, type: "overdue", onClick: () => handleOverdueClick(item) }, item.id));
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5" }), "\u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F"] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(ArrowUpCircle, { className: "w-4 h-4 text-blue-600" }), _jsx("h3", { className: "font-medium text-sm", children: "\u0412\u044B\u0434\u0430\u0447\u0438 \u0441\u0435\u0433\u043E\u0434\u043D\u044F" }), _jsx(Badge, { variant: "outline", className: "text-xs", children: data.pickups_today.length })] }), _jsx("div", { className: "space-y-2", children: data.pickups_today.length > 0 ? (sortPickupsByPriority(data.pickups_today, today).map(renderPickupItem)) : (_jsx("div", { className: "text-center py-4 text-sm text-gray-500", children: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u043D\u0435\u0442 \u0432\u044B\u0434\u0430\u0447" })) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(ArrowDownCircle, { className: "w-4 h-4 text-green-600" }), _jsx("h3", { className: "font-medium text-sm", children: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442\u044B \u0441\u0435\u0433\u043E\u0434\u043D\u044F" }), _jsx(Badge, { variant: "outline", className: "text-xs", children: data.returns_today.length })] }), _jsx("div", { className: "space-y-2", children: data.returns_today.length > 0 ? (data.returns_today.map(renderReturnItem)) : (_jsx("div", { className: "text-center py-4 text-sm text-gray-500", children: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u043D\u0435\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043E\u0432" })) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-red-600" }), _jsx("h3", { className: "font-medium text-sm", children: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0430\u0440\u0435\u043D\u0434\u044B" }), _jsx(Badge, { variant: "outline", className: "text-xs", children: data.overdue_rentals.length })] }), _jsx("div", { className: "space-y-2", children: data.overdue_rentals.length > 0 ? (sortOverdueRentalsByDays(data.overdue_rentals).map(renderOverdueItem)) : (_jsx("div", { className: "text-center py-4 text-sm text-gray-500", children: "\u041D\u0435\u0442 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0445 \u0430\u0440\u0435\u043D\u0434" })) })] })] })] }));
}
