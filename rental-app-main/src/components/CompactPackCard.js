import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/CompactPackCard.tsx
import React, { useMemo } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePackCardViewModel } from "@/hooks/features/usePackCardViewModel";
const CompactPackCardComponent = ({ pack, onOpenDetails }) => {
    // Переиспользуем всю бизнес-логику из ViewModel
    const { isAvailable, priceDetails, isLoadingPrice, handleReserveAction, buttonText, buttonVariant } = usePackCardViewModel(pack);
    // Определяем статус доступности и соответствующие стили
    const availabilityStatus = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "text-green-600"
            };
        }
        if (pack.available_count > 0) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "text-orange-600"
            };
        }
        return {
            text: `Доступно: 0 из ${pack.total_count}`,
            className: "text-red-600"
        };
    }, [pack.available_count, pack.total_count]);
    // Определяем цвет фона карточки в зависимости от статуса доступности
    const cardBackgroundClass = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return "bg-white border-gray-200 hover:bg-gray-50"; // Белый для полной доступности
        }
        if (pack.available_count > 0) {
            return "bg-orange-50 border-orange-200 hover:bg-orange-100"; // Оранжевый для частичной доступности
        }
        return "bg-red-50 border-red-200 hover:bg-red-100"; // Красный для недоступности
    }, [pack.available_count, pack.total_count]);
    const handleCardClick = (e) => {
        if (e.target.closest('button'))
            return;
        onOpenDetails?.(pack);
    };
    const handleButtonClick = (e) => {
        e.stopPropagation();
        handleReserveAction(e);
    };
    return (_jsx("div", { className: cn("relative p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md", cardBackgroundClass), onClick: handleCardClick, tabIndex: 0, children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-4 h-4 text-blue-600 flex-shrink-0" }), _jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u041F\u0430\u0447\u043A\u0430" })] }), _jsx("h3", { className: "text-sm font-semibold text-gray-900 truncate", title: pack.name, children: pack.name }), _jsxs("p", { className: "text-xs text-gray-500", children: [pack.brand, " \u2022 ", pack.equipment_type] })] }), _jsx("div", { className: "text-xs", children: _jsx("span", { className: cn("font-medium", availabilityStatus.className), children: availabilityStatus.text }) }), _jsx("div", { className: "text-sm", children: isLoadingPrice ? (_jsx("span", { className: "text-gray-500", children: "\u0420\u0430\u0441\u0447\u0435\u0442 \u0446\u0435\u043D\u044B..." })) : priceDetails && isAvailable ? (_jsxs("div", { className: "flex items-baseline gap-1", children: [_jsx("span", { className: "text-gray-600", children: "\u043E\u0442" }), _jsxs("span", { className: "font-bold text-gray-900", children: [priceDetails.final_total.toLocaleString('ru-RU'), " \u20BD"] }), _jsx("span", { className: "text-gray-600 text-xs", children: "/\u0434\u0435\u043D\u044C" })] })) : (_jsx("span", { className: "text-gray-500 font-medium", children: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445" })) }), _jsx("div", { className: "pt-1", children: _jsx(Button, { size: "sm", className: "w-full text-xs", onClick: handleButtonClick, disabled: !isAvailable, variant: buttonVariant, children: buttonText }) })] }) }));
};
// Мемоизированная версия компонента для оптимизации производительности
const CompactPackCard = React.memo(CompactPackCardComponent);
export default CompactPackCard;
