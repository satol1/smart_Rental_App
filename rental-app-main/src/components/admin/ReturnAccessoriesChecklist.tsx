// src/components/admin/ReturnAccessoriesChecklist.tsx

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminRentalOut } from "@/types/rental";
import type { Accessory } from "@/types/accessory";
import type { Equipment } from "@/types/equipment";

interface Props {
    rental: AdminRentalOut;
    accessoriesByEquipment: Record<number, Accessory[]>;
    checkedAccessories: Set<string>;
    handleToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    totalAccessoriesCount: number;
}

export default function ReturnAccessoriesChecklist({
    rental,
    accessoriesByEquipment,
    checkedAccessories,
    handleToggleAccessory,
    totalAccessoriesCount,
}: Props) {
    if (totalAccessoriesCount === 0) {
        return null;
    }

    return (
        <div className="space-y-3 pt-3 border-t">
            <Label className="font-semibold">Подтвердите возврат аксессуаров:</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3 bg-muted">
                {rental.equipment.map((eq: Equipment) => (
                    accessoriesByEquipment[eq.id] && (
                        <div key={eq.id}>
                            <p className="text-sm font-medium text-foreground">{eq.name}</p>
                            <ul className="pl-4 mt-1 space-y-1">
                                {accessoriesByEquipment[eq.id].map((acc: Accessory) => {
                                    const key = `${eq.id}-${acc.id}`;
                                    return (
                                        <li key={key} className="flex items-center">
                                            <Checkbox
                                                id={key}
                                                checked={checkedAccessories.has(key)}
                                                onCheckedChange={() => handleToggleAccessory(eq.id, acc.id)}
                                            />
                                            <Label htmlFor={key} className="ml-2 text-sm font-normal cursor-pointer">
                                                {acc.name}
                                            </Label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
