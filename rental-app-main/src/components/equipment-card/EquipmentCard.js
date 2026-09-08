import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/equipment-card/EquipmentCard.tsx
import React, { useState } from "react";
import { CheckCircle } from "lucide-react";
import { formatDateRangeEuropean } from "@/lib/utils";
// Подкомпоненты
import { CardImage } from "./CardImage";
import { DiscountInfo } from "./DiscountInfo";
import { AccessoriesSection } from "./AccessoriesSection";
import { CardFooter } from "./CardFooter";
import EquipmentDetailsDialog from "@/components/equipment/EquipmentDetailsDialog";
import { isEquipmentUnderRepair, getEquipmentCardStyles, getEquipmentStatusText } from "@/lib/equipmentUtils";
// ViewModel хук
import { useEquipmentCardViewModel } from "@/hooks/features/useEquipmentCardViewModel";
const EquipmentCardComponent = (props) => {
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
    const { status, startDate, endDate, isSelected, onToggleSelection, isAccessorySelected, onToggleAccessory, isCalculatorVisible, discountData, handleSetStartDate } = cardConfig;
    // Правила хуков: useState до guard, иначе смена исхода guard между
    // рендерами роняет React («Rendered fewer hooks than expected»)
    const [showDetails, setShowDetails] = useState(false);
    const [showAccessories, setShowAccessories] = useState(false);
    // Защитный код: проверяем, что все необходимые данные получены
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('EquipmentCard: Missing or invalid data', { equipment, discountData });
        return null;
    }
    const isUnderRepair = isEquipmentUnderRepair(equipment);
    // Вся логика handleSetStartDate теперь приходит через props из useEquipmentCardViewModel
    const handleCardClick = (e) => {
        if (e.target.closest("button, a, label, input[type='checkbox']"))
            return;
        setShowDetails(true);
    };
    const stopPropagationAndToggle = (e, action) => {
        e.stopPropagation();
        action();
    };
    const cardStyles = getEquipmentCardStyles(equipment, status, isSelected);
    const backgroundClass = cardStyles.background;
    const selectionClass = cardStyles.border;
    const dateRangeDisplay = (startDate && endDate) ? `(${formatDateRangeEuropean(startDate, endDate)})` : "";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `relative group rounded-xl shadow transition w-full max-w-sm flex flex-col justify-between cursor-pointer overflow-hidden ${backgroundClass} ${selectionClass}`, onClick: handleCardClick, onDoubleClick: handleCardClick, tabIndex: 0, children: [isSelected && _jsx("div", { className: "absolute top-2.5 right-2.5 z-10 bg-sky-600 text-white rounded-full p-1 shadow", children: _jsx(CheckCircle, { className: "w-5 h-5" }) }), _jsx(CardImage, { imageUrl: equipment.image_url, name: equipment.name }), _jsxs("div", { className: "p-4 flex-1 flex flex-col", children: [_jsxs("div", { className: "flex-grow", children: [_jsx("h3", { className: "text-lg font-semibold mb-1", children: equipment.name }), _jsxs("p", { className: "text-sm text-gray-500 mb-2", children: [equipment.brand, " \u2022 ", equipment.equipment_type] }), equipment.short_description && _jsxs("p", { className: "text-sm italic text-gray-600 mb-2", children: ["\"", equipment.short_description, "\""] }), isUnderRepair ? (_jsx("p", { className: "text-base font-bold text-gray-500 mb-1", children: getEquipmentStatusText(equipment) })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-sm mb-1", children: ["\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: ", _jsx("strong", { children: equipment.condition })] }), _jsxs("p", { className: "text-base font-bold mb-1", children: [equipment.daily_rate, " \u20BD / \u0434\u0435\u043D\u044C"] })] })), isCalculatorVisible && _jsx(DiscountInfo, { ...discountData })] }), _jsx(AccessoriesSection, { equipment: equipment, isExpanded: showAccessories, isDisabled: (status !== 'available' && status !== 'added') || isUnderRepair, onToggleExpand: (e) => stopPropagationAndToggle(e, () => setShowAccessories(p => !p)), onToggleAccessory: onToggleAccessory, isAccessorySelected: isAccessorySelected }), _jsx(CardFooter, { status: status, dateRange: dateRangeDisplay, selected: isSelected, onToggleSelection: (e) => stopPropagationAndToggle(e, onToggleSelection), isUnavailable: isUnderRepair, dailyStatus: dailyStatus, onSetStartDate: handleSetStartDate })] })] }), _jsx(EquipmentDetailsDialog, { open: showDetails, onClose: () => setShowDetails(false), equipment: equipment, availability: { equipment_id: equipment.id, status: status, details: "" } })] }));
};
// Компонент для обратной совместимости (старый API)
const EquipmentCardLegacyComponent = (props) => {
    const { equipment, status, startDate, endDate, dailyStatus, isSelected, onToggleSelection, isAccessorySelected, onToggleAccessory, isCalculatorVisible, discountData, handleSetStartDate } = props;
    // Правила хуков: useState до guard (см. основной вариант выше)
    const [showDetails, setShowDetails] = useState(false);
    const [showAccessories, setShowAccessories] = useState(false);
    // Защитный код: проверяем, что все необходимые данные переданы
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('EquipmentCardLegacy: Missing or invalid data', { equipment, discountData });
        return null;
    }
    const isUnderRepair = isEquipmentUnderRepair(equipment);
    const handleCardClick = (e) => {
        if (e.target.closest("button, a, label, input[type='checkbox']"))
            return;
        setShowDetails(true);
    };
    const stopPropagationAndToggle = (e, action) => {
        e.stopPropagation();
        action();
    };
    const cardStyles = getEquipmentCardStyles(equipment, status, isSelected);
    const backgroundClass = cardStyles.background;
    const selectionClass = cardStyles.border;
    const dateRangeDisplay = (startDate && endDate) ? `(${formatDateRangeEuropean(startDate, endDate)})` : "";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `relative group rounded-xl shadow transition w-full max-w-sm flex flex-col justify-between cursor-pointer overflow-hidden ${backgroundClass} ${selectionClass}`, onClick: handleCardClick, onDoubleClick: handleCardClick, tabIndex: 0, children: [isSelected && _jsx("div", { className: "absolute top-2.5 right-2.5 z-10 bg-sky-600 text-white rounded-full p-1 shadow", children: _jsx(CheckCircle, { className: "w-5 h-5" }) }), _jsx(CardImage, { imageUrl: equipment.image_url, name: equipment.name }), _jsxs("div", { className: "p-4 flex-1 flex flex-col", children: [_jsxs("div", { className: "flex-grow", children: [_jsx("h3", { className: "text-lg font-semibold mb-1", children: equipment.name }), _jsxs("p", { className: "text-sm text-gray-500 mb-2", children: [equipment.brand, " \u2022 ", equipment.equipment_type] }), equipment.short_description && _jsxs("p", { className: "text-sm italic text-gray-600 mb-2", children: ["\"", equipment.short_description, "\""] }), isUnderRepair ? (_jsx("p", { className: "text-base font-bold text-gray-500 mb-1", children: getEquipmentStatusText(equipment) })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-sm mb-1", children: ["\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: ", _jsx("strong", { children: equipment.condition })] }), _jsxs("p", { className: "text-base font-bold mb-1", children: [equipment.daily_rate, " \u20BD / \u0434\u0435\u043D\u044C"] })] })), isCalculatorVisible && _jsx(DiscountInfo, { ...discountData })] }), _jsx(AccessoriesSection, { equipment: equipment, isExpanded: showAccessories, isDisabled: (status !== 'available' && status !== 'added') || isUnderRepair, onToggleExpand: (e) => stopPropagationAndToggle(e, () => setShowAccessories(p => !p)), onToggleAccessory: onToggleAccessory, isAccessorySelected: isAccessorySelected }), _jsx(CardFooter, { status: status, dateRange: dateRangeDisplay, selected: isSelected, onToggleSelection: (e) => stopPropagationAndToggle(e, onToggleSelection), isUnavailable: isUnderRepair, dailyStatus: dailyStatus, onSetStartDate: handleSetStartDate })] })] }), _jsx(EquipmentDetailsDialog, { open: showDetails, onClose: () => setShowDetails(false), equipment: equipment, availability: { equipment_id: equipment.id, status: status, details: "" } })] }));
};
// Мемоизированная версия нового компонента
export const EquipmentCard = React.memo(EquipmentCardComponent, (prevProps, nextProps) => {
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
export const EquipmentCardLegacy = React.memo(EquipmentCardLegacyComponent, (prevProps, nextProps) => {
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
        return false; // Пропсы изменились, нужно перерендерить
    }
    // Проверяем состояние аксессуаров - они могут измениться даже если ссылки на функции одинаковые
    if (prevProps.equipment?.accessories && nextProps.equipment?.accessories) {
        for (const acc of prevProps.equipment.accessories) {
            const prevSelected = prevProps.isAccessorySelected(prevProps.equipment.id, acc.id);
            const nextSelected = nextProps.isAccessorySelected(nextProps.equipment.id, acc.id);
            if (prevSelected !== nextSelected) {
                return false; // Состояние аксессуара изменилось
            }
        }
    }
    return true; // Пропсы не изменились, можно пропустить перерендер
});
