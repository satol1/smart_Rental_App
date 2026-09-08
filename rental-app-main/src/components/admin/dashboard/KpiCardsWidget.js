import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/dashboard/KpiCardsWidget.tsx
import { formatMoney } from "@/components/ui/money-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Truck, Package, ClipboardList, DollarSign, TrendingUp, BarChart3, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Функции для форматирования значений
const formatValue = (value, format) => {
    switch (format) {
        case 'currency':
            return formatMoney(value);
        case 'percentage':
            return `${value.toFixed(1)}%`;
        case 'days':
            return `${value.toFixed(1)} дн.`;
        default:
            return value.toLocaleString();
    }
};
// Функции для получения цветовых классов
const getColorClasses = (color) => {
    switch (color) {
        case 'primary':
            return 'text-blue-600';
        case 'success':
            return 'text-green-600';
        case 'warning':
            return 'text-yellow-600';
        case 'danger':
            return 'text-red-600';
        case 'info':
            return 'text-cyan-600';
        case 'muted':
            return 'text-gray-500';
        default:
            return 'text-gray-900';
    }
};
const getSizeClasses = (size) => {
    switch (size) {
        case 'sm':
            return 'text-sm';
        case 'lg':
            return 'text-xl';
        default:
            return 'text-lg';
    }
};
const getVariantClasses = (variant) => {
    switch (variant) {
        case 'highlight':
            return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300';
        case 'accent':
            return 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:border-emerald-300';
        default:
            return 'bg-white border-gray-200 hover:border-gray-300';
    }
};
// Компонент отдельной KPI карточки с навигацией
const KpiCard = ({ title, icon, stats, navigateTo, variant = 'default' }) => {
    const navigate = useNavigate();
    return (_jsxs(Card, { onClick: () => navigate(navigateTo), className: `cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${getVariantClasses(variant)}`, children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-semibold text-gray-700", children: title }), _jsx("div", { className: "p-1.5 rounded-lg bg-white/50", children: icon })] }), _jsx(CardContent, { className: "pt-0", children: _jsx("div", { className: "flex justify-between items-baseline gap-2", children: stats.map((stat, index) => (_jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "text-center flex-1", children: [_jsx("div", { className: `${getSizeClasses(stat.size)} font-bold ${getColorClasses(stat.color)}`, children: formatValue(stat.value, stat.format) }), _jsx("p", { className: "text-xs text-gray-500 font-medium mt-1", children: stat.label })] }), index < stats.length - 1 && (_jsx("div", { className: "w-px h-8 bg-gray-300 mx-2" }))] }, index))) }) })] }));
};
export default function KpiCardsWidget({ data, isLoading }) {
    if (isLoading) {
        return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: Array.from({ length: 8 }).map((_, index) => (_jsxs(Card, { className: "bg-white", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(Skeleton, { className: "h-4 w-20" }), _jsx(Skeleton, { className: "h-6 w-6 rounded-lg" })] }), _jsx(CardContent, { className: "pt-0", children: _jsxs("div", { className: "flex justify-between items-baseline gap-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "text-center flex-1", children: [_jsx(Skeleton, { className: "h-6 w-12 mb-1" }), _jsx(Skeleton, { className: "h-3 w-16" })] }), _jsx("div", { className: "w-px h-8 bg-gray-200 mx-2" })] }), _jsx("div", { className: "flex items-center", children: _jsxs("div", { className: "text-center flex-1", children: [_jsx(Skeleton, { className: "h-5 w-10 mb-1" }), _jsx(Skeleton, { className: "h-3 w-14" })] }) })] }) })] }, index))) }));
    }
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(KpiCard, { title: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", navigateTo: "/admin/users", variant: "highlight", icon: _jsx(Users, { className: "h-5 w-5 text-blue-600" }), stats: [
                    {
                        value: data.total_users,
                        label: 'Всего пользователей',
                        color: 'primary',
                        size: 'lg'
                    },
                    {
                        value: data.active_users,
                        label: 'Активных',
                        color: 'success',
                        size: 'md'
                    }
                ] }), _jsx(KpiCard, { title: "\u0410\u0440\u0435\u043D\u0434\u044B", navigateTo: "/admin/rentals", variant: "accent", icon: _jsx(Truck, { className: "h-5 w-5 text-emerald-600" }), stats: [
                    {
                        value: data.total_rentals,
                        label: 'Всего аренд',
                        color: 'primary',
                        size: 'lg'
                    },
                    {
                        value: data.active_rentals,
                        label: 'Активных',
                        color: 'success',
                        size: 'md'
                    },
                    {
                        value: data.overdue_rentals,
                        label: 'Просрочено',
                        color: 'danger',
                        size: 'md'
                    }
                ] }), _jsx(KpiCard, { title: "\u0420\u0435\u0437\u0435\u0440\u0432\u044B", navigateTo: "/admin/reservations", icon: _jsx(ClipboardList, { className: "h-5 w-5 text-purple-600" }), stats: [
                    {
                        value: data.total_reservations,
                        label: 'Всего резервов',
                        color: 'primary',
                        size: 'lg'
                    },
                    {
                        value: data.active_reservations,
                        label: 'Активных',
                        color: 'info',
                        size: 'md'
                    }
                ] }), _jsx(KpiCard, { title: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435", navigateTo: "/admin/equipment", icon: _jsx(Package, { className: "h-5 w-5 text-orange-600" }), stats: [
                    {
                        value: data.total_equipment,
                        label: 'Единиц оборудования',
                        color: 'primary',
                        size: 'lg'
                    },
                    {
                        value: data.total_accessories,
                        label: 'Аксессуаров',
                        color: 'warning',
                        size: 'md'
                    },
                    {
                        value: data.total_associations,
                        label: 'Ассоциаций',
                        color: 'muted',
                        size: 'sm'
                    }
                ] }), _jsx(KpiCard, { title: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F", navigateTo: "/admin/rentals", variant: "highlight", icon: _jsx(DollarSign, { className: "h-5 w-5 text-green-600" }), stats: [
                    {
                        value: data.revenue_today,
                        label: 'За сегодня',
                        color: 'success',
                        size: 'lg',
                        format: 'currency'
                    }
                ] }), _jsx(KpiCard, { title: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446", navigateTo: "/admin/rentals", variant: "accent", icon: _jsx(TrendingUp, { className: "h-5 w-5 text-emerald-600" }), stats: [
                    {
                        value: data.revenue_this_month,
                        label: 'За текущий месяц',
                        color: 'success',
                        size: 'lg',
                        format: 'currency'
                    }
                ] }), _jsx(KpiCard, { title: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u043E\u0441\u0442\u044C", navigateTo: "/admin/equipment", icon: _jsx(BarChart3, { className: "h-5 w-5 text-cyan-600" }), stats: [
                    {
                        value: data.occupancy_rate,
                        label: 'Средняя загруженность',
                        color: data.occupancy_rate > 70 ? 'success' : data.occupancy_rate > 40 ? 'warning' : 'danger',
                        size: 'lg',
                        format: 'percentage'
                    }
                ] }), _jsx(KpiCard, { title: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", navigateTo: "/admin/rentals", icon: _jsx(Clock, { className: "h-5 w-5 text-indigo-600" }), stats: [
                    {
                        value: data.avg_rental_duration,
                        label: 'Аренды в днях',
                        color: 'info',
                        size: 'lg',
                        format: 'days'
                    }
                ] })] }));
}
