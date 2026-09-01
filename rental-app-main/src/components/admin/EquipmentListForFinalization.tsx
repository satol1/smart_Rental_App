// src/components/admin/EquipmentListForFinalization.tsx

import { Equipment } from "@/types/equipment";
import { AvailabilityInfo } from "@/types/availability";
import EditableEquipmentItem from "@/components/reservation/EditableEquipmentItem";

interface Props {
    equipmentWithAccessories: Equipment[];
    newlyAddedIds: Set<number>;
    availabilityMap: Record<number, AvailabilityInfo>;
    selectedAccessories: Record<number, number[]>;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    disabled?: boolean;
}

export default function EquipmentListForFinalization({
    equipmentWithAccessories,
    newlyAddedIds,
    availabilityMap,
    selectedAccessories,
    onToggleAccessory,
    disabled = false
}: Props) {
    if (equipmentWithAccessories.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
                Оборудование не выбрано
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Выбранное оборудование ({equipmentWithAccessories.length} позиций)
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {equipmentWithAccessories.map((equipment) => {
                    const availability = availabilityMap[equipment.id];
                    const hasConflict = !!availability && (
                        availability.status === "reserved" || availability.status === "rented"
                    );
                    const isNew = newlyAddedIds.has(equipment.id);
                    const selectedAccessoryIds = selectedAccessories[equipment.id] || [];

                    return (
                        <EditableEquipmentItem
                            key={equipment.id}
                            itemDetail={{
                                id: equipment.id,
                                label: `${equipment.brand} ${equipment.name}`
                            }}
                            fullEquipmentItem={equipment}
                            isNew={isNew}
                            hasConflict={hasConflict}
                            availability={availability}
                            selectedAccessoryIds={selectedAccessoryIds}
                            onRemove={() => {}} // Удаление недоступно на шаге финализации
                            onToggleAccessory={onToggleAccessory}
                            disabled={disabled}
                        />
                    );
                })}
            </div>
        </div>
    );
}
