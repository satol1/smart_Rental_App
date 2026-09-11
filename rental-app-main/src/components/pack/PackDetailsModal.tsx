// rental-app-main/src/components/pack/PackDetailsModal.tsx

import React, { useMemo } from "react";
import { Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReserveStore } from "@/store/reserveStore";
import { toast } from "sonner";
import { useEquipmentCardViewModel } from "@/hooks/features/useEquipmentCardViewModel";
import CompactEquipmentCard from "@/components/CompactEquipmentCard";
import { EquipmentCard } from "@/components/equipment-card/EquipmentCard";
import type { CatalogPackItem } from "@/types/catalog";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo, DayStatus, EquipmentStatus } from "@/types/availability";
import type { EquipmentCardOptions } from "@/types/equipmentCard";
import type { ViewMode } from "@/store/viewModeStore";
import { Button } from "@/components/ui/button";

// Внутренний компонент-обертка для карточки, чтобы не вызывать хуки в цикле
const PackEquipmentCard: React.FC<{
    equipment: Equipment;
    availability?: AvailabilityInfo;
    dailyStatus?: Record<string, DayStatus>;
    viewMode: ViewMode;
    isSelected: boolean;
    onToggleSelection: (equipment: Equipment) => void;
    isAccessorySelected: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    getEquipmentStatus?: (eq: Equipment) => EquipmentStatus | "my_reservation" | "added";
}> = ({ equipment, availability, dailyStatus, viewMode, isSelected, onToggleSelection, isAccessorySelected, onToggleAccessory, getEquipmentStatus }) => {
    
    // ViewModel управляет всей логикой получения пропсов для карточки
    const cardOptions: EquipmentCardOptions = {
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
        ? <CompactEquipmentCard {...cardProps} /> 
        : <EquipmentCard {...cardProps} />;
};

interface PackDetailsModalProps {
    pack: CatalogPackItem | null;
    isOpen: boolean;
    onClose: () => void;
    equipmentData: Equipment[];
    availabilityData?: AvailabilityInfo[];
    dailyAvailabilityData?: Record<number, Record<string, DayStatus>>;
    isLoading?: boolean;
    viewMode: ViewMode;
    getEquipmentStatus?: (eq: Equipment) => EquipmentStatus | "my_reservation" | "added";
}


export default function PackDetailsModal({ 
    pack, 
    isOpen, 
    onClose, 
    equipmentData,
    availabilityData, 
    dailyAvailabilityData,
    isLoading = false,
    viewMode,
    getEquipmentStatus
}: PackDetailsModalProps) {
    // Получаем данные из глобального состояния
    const { items, toggle, toggleAccessory, isAccessorySelected: globalIsAccessorySelected } = useReserveStore();

    // Адаптивная ширина модального окна
    const modalWidthClass = useMemo(() => {
        const count = equipmentData.length;
        if (viewMode === 'compact') {
            if (count <= 3) return "max-w-3xl";
            if (count <= 4) return "max-w-4xl";
            if (count <= 5) return "max-w-5xl";
            return "max-w-6xl";
        }
        // Для 'default' view
        if (count <= 1) return "max-w-md";
        if (count <= 2) return "max-w-3xl";
        return "max-w-5xl";
    }, [equipmentData.length, viewMode]);

    // Адаптивная сетка, не зависящая от viewport
    const gridClasses = useMemo(() => {
        const baseClasses = "grid gap-4 p-1";
        const count = equipmentData.length;
        
        if (viewMode === 'compact') {
            if (count > 4) return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
            if (count > 2) return `${baseClasses} grid-cols-2 md:grid-cols-3`;
            if (count === 2) return `${baseClasses} grid-cols-2`;
            return `${baseClasses} grid-cols-1`;
        }
        
        if (count > 2) return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
        if (count === 2) return `${baseClasses} grid-cols-1 md:grid-cols-2`;
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
                if (status === 'available') available++;
                else if (status === 'reserved') reserved++;
                else if (status === 'rented') rented++;
            });
        } else {
            available = total;
        }
        return { total, available, reserved, rented };
    }, [equipmentData, availabilityData]);
    
    // Подсчитываем количество выбранных позиций из глобального состояния
    const selectedCount = items.filter(item => 
        equipmentData.some(eq => eq.id === item.id)
    ).length;
    
    // Обработчик переключения выбора оборудования - используем глобальное состояние
    const handleToggleEquipment = (equipment: Equipment) => {
        toggle(equipment);
    };
    
    // Обработчик переключения аксессуара - используем глобальное состояние
    const handleToggleAccessory = (equipmentId: number, accessoryId: number) => {
        toggleAccessory(equipmentId, accessoryId);
    };
    
    // Проверка выбранности аксессуара - используем глобальное состояние
    const isAccessorySelected = (equipmentId: number, accessoryId: number) => {
        return globalIsAccessorySelected(equipmentId, accessoryId);
    };
    
    // Проверка выбранности оборудования - используем глобальное состояние из useReserveStore
    const isEquipmentSelected = (equipmentId: number) => {
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

    if (!pack) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className={`${modalWidthClass} max-h-[90vh] overflow-hidden flex flex-col`}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        {pack.name}
                    </DialogTitle>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <p>{pack.equipment_ids.length} единиц оборудования в пачке</p>
                        {!isLoading && equipmentData.length > 0 && (
                            <div className="flex gap-4 text-xs">
                                <span className="text-green-600">
                                    Доступно: {availabilityStats.available}
                                </span>
                                {availabilityStats.reserved > 0 && (
                                    <span className="text-orange-600">
                                        Зарезервировано: {availabilityStats.reserved}
                                    </span>
                                )}
                                {availabilityStats.rented > 0 && (
                                    <span className="text-red-600">
                                        В аренде: {availabilityStats.rented}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {isLoading && <p className="text-center py-8">Загрузка...</p>}
                    
                    {!isLoading && equipmentData.length > 0 && (
                        <div className={gridClasses}>
                            {equipmentData.map((equipment) => {
                                const availability = availabilityData?.find(a => a.equipment_id === equipment.id);
                                const dailyStatus = dailyAvailabilityData?.[equipment.id];

                                return (
                                    <PackEquipmentCard
                                        key={equipment.id}
                                        equipment={equipment}
                                        availability={availability}
                                        dailyStatus={dailyStatus}
                                        viewMode={viewMode}
                                        isSelected={isEquipmentSelected(equipment.id)}
                                        onToggleSelection={handleToggleEquipment}
                                        isAccessorySelected={isAccessorySelected}
                                        onToggleAccessory={handleToggleAccessory}
                                        getEquipmentStatus={getEquipmentStatus}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                        Выбрано позиций: {selectedCount}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button 
                            onClick={handleAddToReserve}
                            disabled={selectedCount === 0}
                        >
                            Добавить в резерв ({selectedCount} шт.)
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}