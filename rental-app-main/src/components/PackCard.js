import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/PackCard.tsx
import { useMemo } from "react";
import { Package, Image as ImageIcon, Users, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePackCardViewModel } from "@/hooks/features/usePackCardViewModel"; // <-- Импортируем новый ViewModel
export default function PackCard({ pack, onOpenDetails }) {
    const { isAvailable, priceDetails, isLoadingPrice, handleReserveAction, buttonText, buttonVariant } = usePackCardViewModel(pack); // <-- Используем ViewModel
    const handleCardClick = (e) => {
        if (e.target.closest('button'))
            return;
        onOpenDetails?.(pack);
    };
    // ✅ НОВАЯ ЛОГИКА: Определяем статус и цвет лейбла (как в CompactPackCard)
    const availabilityStatus = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "bg-green-100 text-green-800 border-green-200"
            };
        }
        if (pack.available_count > 0) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200" // Желтый для частичной доступности
            };
        }
        return {
            text: `Доступно: 0 из ${pack.total_count}`,
            className: "bg-red-100 text-red-800 border-red-200" // Красный для полной недоступности
        };
    }, [pack.available_count, pack.total_count]);
    return (_jsxs("div", { className: "group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer flex flex-col", onClick: handleCardClick, children: [_jsx("div", { className: "relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-lg", children: pack.image_url ? (_jsx("img", { src: pack.image_url, alt: pack.name, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy" })) : (_jsx(ImageIcon, { className: "w-16 h-16 text-gray-300" })) }), _jsxs("div", { className: "p-4 flex flex-col flex-grow", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Package, { className: "w-5 h-5 text-blue-600" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "\u041F\u0430\u0447\u043A\u0430 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] }), _jsx("div", { className: cn("text-base font-bold px-4 py-1.5 rounded-full border", availabilityStatus.className), children: availabilityStatus.text })] }), _jsx("h3", { className: "font-semibold text-lg text-gray-900 mb-2", children: pack.name }), _jsxs("div", { className: "space-y-2 mb-4 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "w-4 h-4" }), _jsxs("span", { children: [pack.brand, " \u2022 ", pack.equipment_type] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsxs("span", { children: [pack.equipment_ids.length, " \u0435\u0434\u0438\u043D\u0438\u0446 \u0432 \u043F\u0430\u0447\u043A\u0435"] })] })] }), _jsxs("div", { className: "text-sm text-gray-500 mb-4 h-12 flex flex-col justify-center border-t border-b py-2", children: [isLoadingPrice && _jsx("span", { children: "\u0420\u0430\u0441\u0447\u0435\u0442 \u0446\u0435\u043D\u044B..." }), !isLoadingPrice && priceDetails && isAvailable && (_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx(DollarSign, { className: "w-4 h-4 text-green-600" }), _jsxs("span", { children: ["\u043E\u0442 ", _jsxs("span", { className: "font-bold text-xl text-gray-800", children: [priceDetails.final_total.toLocaleString('ru-RU'), " \u20BD"] }), " / \u0432 \u0434\u0435\u043D\u044C"] }), priceDetails.discount_amount > 0 && (_jsxs("span", { className: "text-green-600", children: ["(\u0441\u043A\u0438\u0434\u043A\u0430 ", priceDetails.discount_amount.toLocaleString('ru-RU'), " \u20BD)"] }))] })), !isLoadingPrice && !isAvailable && (_jsx("span", { className: "font-medium text-gray-500", children: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0434\u043B\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u0430" }))] })] }), _jsx("div", { className: "p-4 border-t mt-auto", children: _jsx(Button, { size: "lg", className: "w-full", onClick: handleReserveAction, disabled: !isAvailable, variant: buttonVariant, children: buttonText }) })] }));
}
