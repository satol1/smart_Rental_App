import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/FinancialInfoBlock.tsx
import React from "react";
import { Tag, Receipt, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyText, formatMoney } from "@/components/ui/money-text";
const FinancialInfoBlockComponent = ({ totalCost, discountAmount, promoCode, variant = 'default', className }) => {
    // Админский стиль - как в AdminRentalCard
    if (variant === 'admin') {
        return (_jsxs("div", { className: cn("flex-shrink-0 md:w-64 bg-slate-50 p-3 rounded-lg border space-y-2", className), children: [_jsxs("h4", { className: "font-semibold text-sm text-slate-800 flex items-center gap-2", children: [_jsx(ReceiptText, { className: "w-4 h-4" }), "\u0424\u0438\u043D\u0430\u043D\u0441\u044B"] }), _jsxs("div", { className: "text-xs space-y-1.5 text-slate-700", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u041E\u0431\u0449\u0430\u044F \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C:" }), _jsx("span", { className: "font-medium", children: totalCost != null ? _jsx(MoneyText, { value: totalCost }) : 'Н/Д' })] }), promoCode && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434:" }), _jsx("span", { className: "font-medium text-purple-600", children: promoCode })] })), (discountAmount ?? 0) > 0 && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u0421\u043A\u0438\u0434\u043A\u0430:" }), _jsxs("span", { className: "font-medium text-green-600", children: ["-", _jsx(MoneyText, { value: discountAmount })] })] }))] })] }));
    }
    // Компактный и стандартный стили (объединены для устранения дублирования)
    const isCompact = variant === 'compact';
    const containerClasses = isCompact
        ? "flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-sm pt-2 border-t border-dashed"
        : "flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-sm";
    return (_jsxs("div", { className: cn(containerClasses, className), children: [promoCode && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-purple-600 self-end", children: [_jsx(Tag, { className: "w-3 h-3" }), _jsx("span", { children: promoCode })] })), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-semibold", children: [_jsx(Receipt, { className: "w-4 h-4 text-gray-500" }), "\u0418\u0442\u043E\u0433:", _jsx("span", { className: "text-gray-800", children: totalCost != null ? _jsx(MoneyText, { value: totalCost }) : 'Н/Д' })] }), (discountAmount ?? 0) > 0 && (_jsxs("div", { className: "text-xs text-green-600 mt-0.5", children: ["\u0441\u043E \u0441\u043A\u0438\u0434\u043A\u043E\u0439 \u0432 ", formatMoney(discountAmount)] }))] })] }));
};
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(FinancialInfoBlockComponent);
