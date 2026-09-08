// src/components/reservation/EditableEquipmentItem.tsx
import { X } from "lucide-react";
import EquipmentItemWithConflicts from "./EquipmentItemWithConflicts";
import { AvailableAccessoriesDropdown } from "./AvailableAccessoriesDropdown"; // <-- Новый импорт
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo } from "@/types/availability";
import { Button } from "@/components/ui/button";

interface Props {
    itemDetail: { id: number; label: string };
    fullEquipmentItem: Equipment | undefined;
    isNew: boolean;
    hasConflict: boolean;
    availability?: AvailabilityInfo;
    selectedAccessoryIds: number[];
    onRemove: (id: number) => void;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    disabled?: boolean;
}

export default function EditableEquipmentItem({
                                                  itemDetail,
                                                  fullEquipmentItem,
                                                  isNew,
                                                  hasConflict,
                                                  availability,
                                                  selectedAccessoryIds,
                                                  onRemove,
                                                  onToggleAccessory,
                                                  disabled
                                              }: Props) {

    if (!fullEquipmentItem) {
        return <div className="p-3 bg-muted rounded-md text-sm text-destructive">Ошибка: данные оборудования не найдены.</div>;
    }

    // Разделяем аксессуары на уже выбранные и доступные для выбора
    const selectedAccessoryDetails = fullEquipmentItem.accessories?.filter(
        acc => selectedAccessoryIds.includes(acc.id)
    ) || [];

    const availableAccessoriesDetails = fullEquipmentItem.accessories?.filter(
        acc => !selectedAccessoryIds.includes(acc.id)
    ) || [];


    return (
        <div className="bg-card p-3 rounded-md border">
            {/* Блок с основной информацией об оборудовании (без изменений) */}
            <EquipmentItemWithConflicts
                item={itemDetail}
                isNew={isNew}
                hasConflict={hasConflict}
                availability={availability}
                onRemove={onRemove}
                disabled={disabled}
                equipmentCondition={fullEquipmentItem.condition}
            />

            {/* Блок для уже добавленных аксессуаров */}
            {selectedAccessoryDetails.length > 0 && (
                <div className="pl-8 pr-2 pt-2 border-t mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Добавленные аксессуары:</p>
                    <ul className="space-y-1">
                        {selectedAccessoryDetails.map(acc => (
                            <li key={acc.id} className="flex justify-between items-center text-xs text-foreground hover:bg-muted p-1 rounded">
                                <span>- {acc.name} <strong>({acc.price} ₽)</strong></span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                                    onClick={() => onToggleAccessory(fullEquipmentItem.id, acc.id)}
                                    disabled={disabled}
                                    title="Убрать аксессуар"
                                    aria-label={`Убрать аксессуар ${acc.name}`}
                                >
                                    <X className="w-3 h-3" aria-hidden="true" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Выпадающий список для добавления новых аксессуаров */}
            <AvailableAccessoriesDropdown
                accessories={availableAccessoriesDetails}
                equipmentId={fullEquipmentItem.id}
                onToggleAccessory={onToggleAccessory}
                disabled={disabled}
                hasTopBorder={selectedAccessoryDetails.length > 0}
            />
        </div>
    );
}
