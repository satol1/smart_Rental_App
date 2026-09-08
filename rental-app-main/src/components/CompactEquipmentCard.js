import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/CompactEquipmentCard.tsx
import React, { useCallback } from "react";
import { CheckCircle } from "lucide-react";
import { formatDateRangeEuropean } from "@/lib/utils";
import { isEquipmentUnderRepair, getEquipmentCardStyles, getEquipmentStatusText } from "@/lib/equipmentUtils";
// ViewModel хук
import { useEquipmentCardViewModel } from "@/hooks/features/useEquipmentCardViewModel";
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// 1. Упрощаем стили, удаляя `ending_today`
const COMPACT_STATUS_STYLES = {
    available: "bg-white border-gray-200 hover:bg-gray-50",
    reserved: "bg-rose-100 border-rose-300",
    rented: "bg-red-200 border-red-400",
    my_reservation: "bg-sky-50 border-sky-200 hover:bg-sky-100",
    added: "bg-green-100 border-green-300",
};
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
const COMPACT_SELECTED_STYLES = "ring-2 ring-offset-1 ring-green-500 border-green-500 bg-green-100";
const CompactEquipmentCardComponent = (props) => {
    const { equipment, dailyStatus, onToggleSelection: externalOnToggleSelection, onToggleAccessory: externalOnToggleAccessory, isAccessorySelected: externalIsAccessorySelected, startDate: externalStartDate, endDate: externalEndDate, status: externalStatus } = props;
    // Используем ViewModel для получения всей логики
    const cardConfig = useEquipmentCardViewModel({
        equipment,
        dailyStatus,
        onToggleSelection: externalOnToggleSelection,
        onToggleAccessory: externalOnToggleAccessory,
        isAccessorySelected: externalIsAccessorySelected,
        startDate: externalStartDate,
        endDate: externalEndDate,
        status: externalStatus
    });
    // Деструктурируем данные из ViewModel
    const { status, startDate, endDate, isSelected, onToggleSelection, accessoriesDailyRate, totalDiscountPercentage, discountData } = cardConfig;
    // Правила хуков: все хуки вызываются до возможного раннего return,
    // иначе смена исхода guard между рендерами роняет React
    const isUnderRepair = equipment ? isEquipmentUnderRepair(equipment) : false;
    const handleCardClick = useCallback((e) => {
        if (e.target.closest("button, a, label, input[type='checkbox']"))
            return;
        // Блокируем клик, если оборудование недоступно
        if (isUnderRepair)
            return;
        // Используем обработчик из пропсов
        if (status === 'available' || status === 'added') {
            onToggleSelection();
        }
    }, [status, onToggleSelection, isUnderRepair]);
    const handleDoubleClick = useCallback((e) => {
        if (e.target.closest("button, a, label, input[type='checkbox']"))
            return;
        // Блокируем двойной клик, если оборудование недоступно
        if (isUnderRepair)
            return;
        // Используем обработчик из пропсов
        if (status === 'available' || status === 'added') {
            onToggleSelection();
        }
    }, [status, onToggleSelection, isUnderRepair]);
    // Защитный код: проверяем, что все необходимые данные переданы
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('CompactEquipmentCard: Missing or invalid data', { equipment, discountData });
        return null;
    }
    // Используем данные из пропсов вместо внутренних вычислений
    const priceData = {
        dailyRate: equipment.daily_rate + accessoriesDailyRate,
        totalPrice: discountData.priceAfter,
        discountPercentage: totalDiscountPercentage,
        days: discountData.days,
    };
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Удаляем useMemo для finalStatus ---
    // const finalStatus: DisplayStatus = useMemo(() => { ... }); // ЭТОТ БЛОК ПОЛНОСТЬЮ УДАЛЕН
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    // Используем централизованную логику для определения стиля
    const cardStyles = getEquipmentCardStyles(equipment, status, isSelected);
    const backgroundClass = isSelected
        ? COMPACT_SELECTED_STYLES
        : isUnderRepair
            ? cardStyles.background + " " + cardStyles.border
            : COMPACT_STATUS_STYLES[status];
    const dateRangeDisplay = (startDate && endDate)
        ? `(${formatDateRangeEuropean(startDate, endDate)})`
        : "";
    return (_jsxs("div", { className: `relative p-3 rounded-lg border transition-all duration-200 cursor-pointer ${backgroundClass}`, onClick: handleCardClick, onDoubleClick: handleDoubleClick, tabIndex: 0, children: [isSelected && (_jsx("div", { className: "absolute top-1 right-1 z-10 bg-green-600 text-white rounded-full p-0.5 shadow", children: _jsx(CheckCircle, { className: "w-3 h-3" }) })), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-900 truncate", title: equipment.name, children: equipment.name }), _jsxs("p", { className: "text-xs text-gray-500", children: [equipment.brand, " \u2022 ", equipment.equipment_type] }), dateRangeDisplay && (_jsx("p", { className: "text-xs text-gray-400", children: dateRangeDisplay }))] }), _jsx("div", { className: "space-y-1", children: isUnderRepair ? (_jsx("div", { className: "text-center", children: _jsx("span", { className: "text-xs font-medium text-gray-500", children: getEquipmentStatusText(equipment) }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("span", { className: "text-xs text-gray-600", children: [priceData.days, " ", priceData.days === 1 ? 'день' : priceData.days < 5 ? 'дня' : 'дней'] }), _jsxs("span", { className: "text-sm font-semibold text-gray-900", children: [priceData.totalPrice.toLocaleString('ru-RU'), " \u20BD"] })] }), priceData.discountPercentage > 0 && (_jsxs("div", { className: "text-xs text-green-600", children: ["\u0421\u043A\u0438\u0434\u043A\u0430: ", priceData.discountPercentage.toFixed(0), "%"] }))] })) }), _jsx("div", { className: "text-xs", children: isUnderRepair ? (_jsx("span", { className: "text-gray-500 font-medium", children: "\u041D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E" })) : (_jsxs(_Fragment, { children: [status === 'available' && (_jsx("span", { className: "text-green-600 font-medium", children: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E" })), status === 'reserved' && (_jsx("span", { className: "text-red-600 font-medium", children: "\u0412 \u0440\u0435\u0437\u0435\u0440\u0432\u0435" })), status === 'rented' && (_jsx("span", { className: "text-red-700 font-medium", children: "\u0412 \u0430\u0440\u0435\u043D\u0434\u0435" })), status === 'my_reservation' && (_jsx("span", { className: "text-sky-600 font-medium", children: "\u0412 \u044D\u0442\u043E\u043C \u0440\u0435\u0437\u0435\u0440\u0432\u0435" })), status === 'added' && (_jsx("span", { className: "text-emerald-600 font-medium", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E" }))] })) })] })] }));
};
// Компонент для обратной совместимости (старый API)
const CompactEquipmentCardLegacyComponent = ({ equipment, status, startDate, endDate, isSelected, isAccessorySelected, onToggleAccessory, isCalculatorVisible, discountData, }) => {
    // Правила хуков: хуки до guard; equipment.id вычисляем безопасно
    const equipmentId = equipment?.id ?? -1;
    const handleToggleAccessory = useCallback((e, accessoryId) => {
        e.stopPropagation();
        if (equipmentId === -1)
            return;
        onToggleAccessory(equipmentId, accessoryId);
    }, [onToggleAccessory, equipmentId]);
    // Защитный код: проверяем, что все необходимые данные переданы
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('CompactEquipmentCardLegacy: Missing or invalid data', { equipment, discountData });
        return null;
    }
    const isUnderRepair = isEquipmentUnderRepair(equipment);
    const backgroundClass = COMPACT_STATUS_STYLES[status] || COMPACT_STATUS_STYLES.available;
    const selectionClass = isSelected ? COMPACT_SELECTED_STYLES : "";
    const dateRangeDisplay = (startDate && endDate) ? `(${formatDateRangeEuropean(startDate, endDate)})` : "";
    return (_jsxs("div", { className: `relative group rounded-lg shadow-sm transition w-full flex items-center justify-between cursor-pointer overflow-hidden ${backgroundClass} ${selectionClass}`, children: [isSelected && _jsx("div", { className: "absolute top-1 right-1 z-10 bg-sky-600 text-white rounded-full p-0.5 shadow", children: _jsx(CheckCircle, { className: "w-3 h-3" }) }), _jsxs("div", { className: "flex-1 p-3 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("h3", { className: "text-sm font-semibold truncate", children: equipment.name }), _jsx("span", { className: "text-xs text-gray-500 ml-2 flex-shrink-0", children: equipment.brand })] }), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: equipment.equipment_type }), _jsxs("span", { className: "font-medium", children: [equipment.daily_rate, " \u20BD/\u0434\u0435\u043D\u044C"] })] }), dateRangeDisplay && (_jsx("div", { className: "text-xs text-gray-500 mb-1", children: dateRangeDisplay })), isCalculatorVisible && discountData.percentage > 0 && (_jsxs("div", { className: "text-xs text-green-600 font-medium", children: ["\u0421\u043A\u0438\u0434\u043A\u0430 ", discountData.percentage, "%: ", Math.round(discountData.priceAfter), " \u20BD"] })), equipment.accessories && equipment.accessories.length > 0 && (_jsxs("div", { className: "mt-1", children: [equipment.accessories.slice(0, 2).map((accessory) => {
                                const isSelected = isAccessorySelected(equipment.id, accessory.id);
                                return (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-gray-600", children: accessory.name }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("span", { className: "text-gray-500", children: [accessory.price, " \u20BD"] }), _jsx("button", { onClick: (e) => handleToggleAccessory(e, accessory.id), className: `w-4 h-4 rounded border flex items-center justify-center text-xs ${isSelected
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 hover:border-green-400'}`, children: isSelected && '✓' })] })] }, accessory.id));
                            }), equipment.accessories.length > 2 && (_jsxs("div", { className: "text-xs text-gray-500", children: ["+", equipment.accessories.length - 2, " \u0435\u0449\u0435"] }))] })), _jsx("div", { className: "text-xs", children: isUnderRepair ? (_jsx("span", { className: "text-gray-500 font-medium", children: "\u041D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E" })) : (_jsxs(_Fragment, { children: [status === 'available' && (_jsx("span", { className: "text-green-600 font-medium", children: "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E" })), status === 'reserved' && (_jsx("span", { className: "text-red-600 font-medium", children: "\u0412 \u0440\u0435\u0437\u0435\u0440\u0432\u0435" })), status === 'rented' && (_jsx("span", { className: "text-red-700 font-medium", children: "\u0412 \u0430\u0440\u0435\u043D\u0434\u0435" })), status === 'my_reservation' && (_jsx("span", { className: "text-sky-600 font-medium", children: "\u0412 \u044D\u0442\u043E\u043C \u0440\u0435\u0437\u0435\u0440\u0432\u0435" })), status === 'added' && (_jsx("span", { className: "text-emerald-600 font-medium", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E" }))] })) })] })] }));
};
// Мемоизированная версия нового компонента
export const CompactEquipmentCard = React.memo(CompactEquipmentCardComponent, (prevProps, nextProps) => {
    // Сравниваем только основные пропсы, так как остальная логика в ViewModel
    if (prevProps.equipment !== nextProps.equipment ||
        prevProps.dailyStatus !== nextProps.dailyStatus ||
        prevProps.startDate !== nextProps.startDate ||
        prevProps.endDate !== nextProps.endDate ||
        prevProps.status !== nextProps.status) {
        return false;
    }
    return true;
});
// Экспорт для обратной совместимости
export const CompactEquipmentCardLegacy = React.memo(CompactEquipmentCardLegacyComponent, (prevProps, nextProps) => {
    // Сравниваем основные пропсы
    if (prevProps.equipment !== nextProps.equipment ||
        prevProps.status !== nextProps.status ||
        prevProps.startDate !== nextProps.startDate ||
        prevProps.endDate !== nextProps.endDate ||
        prevProps.dailyStatus !== nextProps.dailyStatus ||
        prevProps.isSelected !== nextProps.isSelected ||
        prevProps.isCalculatorVisible !== nextProps.isCalculatorVisible ||
        prevProps.accessoriesDailyRate !== nextProps.accessoriesDailyRate ||
        prevProps.totalDiscountPercentage !== nextProps.totalDiscountPercentage ||
        prevProps.discountData !== nextProps.discountData) {
        return false;
    }
    return true;
});
// Экспорт по умолчанию - новый компонент
export default CompactEquipmentCard;
