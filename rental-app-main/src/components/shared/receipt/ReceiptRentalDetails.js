import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
export default function ReceiptRentalDetails({ rentalData, isCompact = false, useCard = true }) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'active': return 'Активная';
            case 'overdue': return 'Просрочена';
            case 'completed': return 'Завершена';
            default: return status;
        }
    };
    const getStatusVariant = (status) => {
        switch (status) {
            case 'active': return 'default';
            case 'overdue': return 'destructive';
            default: return 'secondary';
        }
    };
    const content = (_jsxs(_Fragment, { children: [_jsxs("h3", { className: `flex items-center gap-2 ${isCompact ? 'text-sm' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`, children: [_jsx(CalendarDays, { className: isCompact ? "w-3 h-3" : "w-5 h-5" }), "\u0414\u0435\u0442\u0430\u043B\u0438 \u0430\u0440\u0435\u043D\u0434\u044B"] }), isCompact ? (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-600", children: "\u041D\u0430\u0447\u0430\u043B\u043E" }), _jsx("p", { className: "text-sm font-semibold", children: formatDate(rentalData.start_date) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-600", children: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435" }), _jsx("p", { className: "text-sm font-semibold", children: formatDate(rentalData.end_date) })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-gray-600", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(Badge, { variant: getStatusVariant(rentalData.status), className: "text-xs px-2 py-0.5", children: getStatusText(rentalData.status) })] })] })) : (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u0414\u0430\u0442\u0430 \u043D\u0430\u0447\u0430\u043B\u0430" }), _jsx("p", { className: "text-base font-semibold", children: formatDate(rentalData.start_date) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F" }), _jsx("p", { className: "text-base font-semibold", children: formatDate(rentalData.end_date) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(Badge, { variant: getStatusVariant(rentalData.status), children: getStatusText(rentalData.status) })] })] }))] }));
    if (!useCard) {
        return (_jsx("div", { className: "border-t pt-2 mt-2", children: content }));
    }
    return (_jsx(Card, { children: _jsx(CardHeader, { className: isCompact ? "pb-2" : "pb-3", children: content }) }));
}
