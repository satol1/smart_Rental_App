import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// rental-app-main/src/components/pack/PackDetailsModal.tsx
import { useMemo } from "react";
import { Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReserveStore } from "@/store/reserveStore";
import { toast } from "sonner";
import { useEquipmentCardViewModel } from "@/hooks/features/useEquipmentCardViewModel";
import CompactEquipmentCard from "@/components/CompactEquipmentCard";
import { EquipmentCard } from "@/components/equipment-card/EquipmentCard";
import { Button } from "@/components/ui/button";
// Внутренний компонент-обертка для карточки, чтобы не вызывать хуки в цикле
const PackEquipmentCard = ({ equipment, availability, dailyStatus, viewMode, isSelected, onToggleSelection, isAccessorySelected, onToggleAccessory, getEquipmentStatus }) => {
    // ViewModel управляет всей логикой получения пропсов для карточки
    const cardOptions = {
        equipment,
        status: getEquipmentStatus ? getEquipmentStatus(equipment) : (availability?.status ?? 'available'),
        startDate: availability?.start_date || undefined,
        endDate: availability?.end_date || undefined,
        dailyStatus,
        isSelected: isSelected,
        onToggleSelection: () => onToggleSelection(equipment),
        isAccessorySelected: isAccessorySelected,
        onToggleAccessory: (eqId, accId) => onToggleAccessory(eqId, accId),
    };
    const cardProps = useEquipmentCardViewModel(cardOptions);
    // Рендерим нужный вид карточки в зависимости от viewMode
    return viewMode === 'compact'
        ? _jsx(CompactEquipmentCard, { ...cardProps })
        : _jsx(EquipmentCard, { ...cardProps });
};
export default function PackDetailsModal({ pack, isOpen, onClose, equipmentData, availabilityData, dailyAvailabilityData, isLoading = false, viewMode, getEquipmentStatus }) {
    // Получаем данные из глобального состояния
    const { items, toggle, toggleAccessory, isAccessorySelected: globalIsAccessorySelected } = useReserveStore();
    // Адаптивная ширина модального окна
    const modalWidthClass = useMemo(() => {
        const count = equipmentData.length;
        if (viewMode === 'compact') {
            if (count <= 3)
                return "max-w-3xl";
            if (count <= 4)
                return "max-w-4xl";
            if (count <= 5)
                return "max-w-5xl";
            return "max-w-6xl";
        }
        // Для 'default' view
        if (count <= 1)
            return "max-w-md";
        if (count <= 2)
            return "max-w-3xl";
        return "max-w-5xl";
    }, [equipmentData.length, viewMode]);
    // Адаптивная сетка, не зависящая от viewport
    const gridClasses = useMemo(() => {
        const baseClasses = "grid gap-4 p-1";
        const count = equipmentData.length;
        if (viewMode === 'compact') {
            if (count > 4)
                return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
            if (count > 2)
                return `${baseClasses} grid-cols-2 md:grid-cols-3`;
            if (count === 2)
                return `${baseClasses} grid-cols-2`;
            return `${baseClasses} grid-cols-1`;
        }
        if (count > 2)
            return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
        if (count === 2)
            return `${baseClasses} grid-cols-1 md:grid-cols-2`;
        return `${baseClasses} grid-cols-1`;
    }, [equipmentData.length, viewMode]);
    // Подсчитываем статистику доступности
    const availabilityStats = useMemo(() => {
        const total = equipmentData.length;
        let available = 0, reserved = 0, rented = 0;
        if (availabilityData) {
            equipmentData.forEach(equipment => {
                const availability = availabilityData.find(a => a.equipment_id === equipment.id);
                const status = availability?.status ?? 'available';
                if (status === 'available')
                    available++;
                else if (status === 'reserved')
                    reserved++;
                else if (status === 'rented')
                    rented++;
            });
        }
        else {
            available = total;
        }
        return { total, available, reserved, rented };
    }, [equipmentData, availabilityData]);
    // Подсчитываем количество выбранных позиций из глобального состояния
    const selectedCount = items.filter(item => equipmentData.some(eq => eq.id === item.id)).length;
    // Обработчик переключения выбора оборудования - используем глобальное состояние
    const handleToggleEquipment = (equipment) => {
        toggle(equipment);
    };
    // Обработчик переключения аксессуара - используем глобальное состояние
    const handleToggleAccessory = (equipmentId, accessoryId) => {
        toggleAccessory(equipmentId, accessoryId);
    };
    // Проверка выбранности аксессуара - используем глобальное состояние
    const isAccessorySelected = (equipmentId, accessoryId) => {
        return globalIsAccessorySelected(equipmentId, accessoryId);
    };
    // Проверка выбранности оборудования - используем глобальное состояние из useReserveStore
    const isEquipmentSelected = (equipmentId) => {
        return items.some(item => item.id === equipmentId);
    };
    // Обработчик добавления в резерв - теперь просто закрываем модальное окно
    // так как все изменения уже применены к глобальному состоянию
    const handleAddToReserve = () => {
        if (selectedCount === 0) {
            toast.info("Выберите хотя бы одну позицию для добавления в резерв");
            return;
        }
        onClose();
        toast.success(`Добавлено ${selectedCount} позиций в резерв`);
    };
    // Обработчик закрытия модального окна
    const handleClose = () => {
        onClose();
    };
    if (!pack)
        return null;
    return (_jsx(Dialog, { open: isOpen, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: `${modalWidthClass} max-h-[90vh] overflow-hidden flex flex-col`, children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Package, { className: "w-5 h-5 text-blue-600" }), pack.name] }), _jsxs("div", { className: "text-sm text-gray-600 mt-1 space-y-1", children: [_jsxs("p", { children: [pack.equipment_ids.length, " \u0435\u0434\u0438\u043D\u0438\u0446 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F \u0432 \u043F\u0430\u0447\u043A\u0435"] }), !isLoading && equipmentData.length > 0 && (_jsxs("div", { className: "flex gap-4 text-xs", children: [_jsxs("span", { className: "text-green-600", children: ["\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ", availabilityStats.available] }), availabilityStats.reserved > 0 && (_jsxs("span", { className: "text-orange-600", children: ["\u0417\u0430\u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043E: ", availabilityStats.reserved] })), availabilityStats.rented > 0 && (_jsxs("span", { className: "text-red-600", children: ["\u0412 \u0430\u0440\u0435\u043D\u0434\u0435: ", availabilityStats.rented] }))] }))] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto -mx-6 px-6", children: [isLoading && _jsx("p", { className: "text-center py-8", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), !isLoading && equipmentData.length > 0 && (_jsx("div", { className: gridClasses, children: equipmentData.map((equipment) => {
                                const availability = availabilityData?.find(a => a.equipment_id === equipment.id);
                                const dailyStatus = dailyAvailabilityData?.[equipment.id];
                                return (_jsx(PackEquipmentCard, { equipment: equipment, availability: availability, dailyStatus: dailyStatus, viewMode: viewMode, isSelected: isEquipmentSelected(equipment.id), onToggleSelection: handleToggleEquipment, isAccessorySelected: isAccessorySelected, onToggleAccessory: handleToggleAccessory, getEquipmentStatus: getEquipmentStatus }, equipment.id));
                            }) }))] }), _jsxs("div", { className: "flex items-center justify-between pt-4 border-t", children: [_jsxs("div", { className: "text-sm text-gray-600", children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u043F\u043E\u0437\u0438\u0446\u0438\u0439: ", selectedCount] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: handleClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsxs(Button, { onClick: handleAddToReserve, disabled: selectedCount === 0, children: ["\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0440\u0435\u0437\u0435\u0440\u0432 (", selectedCount, " \u0448\u0442.)"] })] })] })] }) }));
}
