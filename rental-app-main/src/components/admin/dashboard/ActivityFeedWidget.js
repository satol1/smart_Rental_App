import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/dashboard/ActivityFeedWidget.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, X, Play, CheckCircle, UserPlus, Package, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
export default function ActivityFeedWidget({ data, isLoading }) {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'reservation_created':
                return _jsx(Calendar, { className: "w-4 h-4 text-blue-600" });
            case 'reservation_cancelled':
                return _jsx(X, { className: "w-4 h-4 text-red-600" });
            case 'rental_started':
                return _jsx(Play, { className: "w-4 h-4 text-green-600" });
            case 'rental_completed':
                return _jsx(CheckCircle, { className: "w-4 h-4 text-green-600" });
            case 'user_registered':
                return _jsx(UserPlus, { className: "w-4 h-4 text-purple-600" });
            case 'equipment_added':
                return _jsx(Package, { className: "w-4 h-4 text-orange-600" });
            default:
                return _jsx(Activity, { className: "w-4 h-4 text-gray-600" });
        }
    };
    const getActivityColor = (type) => {
        switch (type) {
            case 'reservation_created':
                return 'bg-blue-50 border-blue-200';
            case 'reservation_cancelled':
                return 'bg-red-50 border-red-200';
            case 'rental_started':
                return 'bg-green-50 border-green-200';
            case 'rental_completed':
                return 'bg-green-50 border-green-200';
            case 'user_registered':
                return 'bg-purple-50 border-purple-200';
            case 'equipment_added':
                return 'bg-orange-50 border-orange-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };
    const getActivityBadgeVariant = (type) => {
        switch (type) {
            case 'reservation_created':
                return 'default';
            case 'reservation_cancelled':
                return 'destructive';
            case 'rental_started':
                return 'secondary';
            case 'rental_completed':
                return 'secondary';
            case 'user_registered':
                return 'outline';
            case 'equipment_added':
                return 'outline';
            default:
                return 'outline';
        }
    };
    const getActivityTypeLabel = (type) => {
        switch (type) {
            case 'reservation_created':
                return 'Резерв создан';
            case 'reservation_cancelled':
                return 'Резерв отменен';
            case 'rental_started':
                return 'Аренда начата';
            case 'rental_completed':
                return 'Аренда завершена';
            case 'user_registered':
                return 'Пользователь зарегистрирован';
            case 'equipment_added':
                return 'Оборудование добавлено';
            default:
                return 'Событие';
        }
    };
    if (isLoading) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "w-5 h-5" }), "\u041B\u0435\u043D\u0442\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"] }) }), _jsx(CardContent, { className: "space-y-4", children: Array.from({ length: 12 }).map((_, index) => (_jsxs("div", { className: "flex items-start gap-3 p-3 border rounded-lg", children: [_jsx(Skeleton, { className: "w-8 h-8 rounded-full" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2" })] }), _jsx(Skeleton, { className: "h-6 w-16" })] }, index))) })] }));
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "w-5 h-5" }), "\u041B\u0435\u043D\u0442\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-3", children: data.length > 0 ? (data.map((activity) => (_jsxs("div", { className: `flex items-start gap-3 p-3 border rounded-lg ${getActivityColor(activity.type)}`, children: [_jsx("div", { className: "flex-shrink-0 mt-0.5", children: getActivityIcon(activity.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 mb-1", children: activity.description }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [_jsx("span", { children: formatDistanceToNow(new Date(activity.timestamp), {
                                                    addSuffix: true,
                                                    locale: ru
                                                }) }), activity.user_name && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: activity.user_name })] })), activity.equipment_name && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: activity.equipment_name })] }))] })] }), _jsx("div", { className: "flex-shrink-0", children: _jsx(Badge, { variant: getActivityBadgeVariant(activity.type), className: "text-xs", children: getActivityTypeLabel(activity.type) }) })] }, activity.id)))) : (_jsxs("div", { className: "text-center py-8 text-sm text-gray-500", children: [_jsx(Activity, { className: "w-8 h-8 mx-auto mb-2 text-gray-400" }), _jsx("p", { children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438" }), _jsx("p", { className: "text-xs", children: "\u0421\u043E\u0431\u044B\u0442\u0438\u044F \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E \u043C\u0435\u0440\u0435 \u0438\u0445 \u0432\u043E\u0437\u043D\u0438\u043A\u043D\u043E\u0432\u0435\u043D\u0438\u044F" })] })) }) })] }));
}
