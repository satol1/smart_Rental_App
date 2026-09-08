// src/components/reservation/ReservationItemsList.tsx
import ReserveEquipmentCard from "@/components/ReserveEquipmentCard";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo } from "@/types/availability";

interface Props {
    items: Equipment[];
    selectedAccessories: Record<number, number[]>;
    availabilityMap: Record<number, AvailabilityInfo>;
    unavailableIdsFromAPI: number[];
    invalidItems: number[];
    onRemoveItem: (id: number) => void;
    onRemoveAccessory: (equipmentId: number, accessoryId: number) => void;
    // ✅ ДОБАВЛЕНЫ НОВЫЕ СВОЙСТВА
    isAccessorySelected: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
}

export default function ReservationItemsList({
                                                 items,
                                                 selectedAccessories,
                                                 availabilityMap,
                                                 unavailableIdsFromAPI,
                                                 invalidItems,
                                                 onRemoveItem,
                                                 onRemoveAccessory,
                                                 // ✅ ПОЛУЧАЕМ НОВЫЕ СВОЙСТВА
                                                 isAccessorySelected,
                                                 onToggleAccessory,
                                             }: Props) {
    return (
        <div className="space-y-4">
            {items.map((item) => {
                const selectedAccessoryIds = selectedAccessories[item.id] || [];
                const selectedAccessoryDetails = item.accessories?.filter(acc =>
                    selectedAccessoryIds.includes(acc.id)
                ) || [];

                return (
                    <div
                        key={item.id}
                        className={`border rounded-2xl overflow-hidden ${
                            unavailableIdsFromAPI.includes(item.id) || invalidItems.includes(item.id)
                                ? "border-destructive/30 bg-card"
                                : "border-border bg-card"
                        }`}
                    >
                        <ReserveEquipmentCard
                            equipment={item}
                            availability={availabilityMap[item.id]}
                            onRemove={() => onRemoveItem(item.id)}
                            // ✅ ПЕРЕДАЕМ ФУНКЦИИ В КАРТОЧКУ
                            isAccessorySelected={isAccessorySelected}
                            onToggleAccessory={onToggleAccessory}
                        />

                        {selectedAccessoryDetails.length > 0 && (
                            <div className="px-4 pb-3 pt-2 bg-muted border-t">
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    Доп. аксессуары:
                                </h4>
                                <ul className="space-y-1.5">
                                    {selectedAccessoryDetails.map(acc => (
                                        <li key={acc.id} className="flex items-center justify-between text-sm hover:bg-muted p-1 rounded-md">
                                            <span className="text-foreground">{acc.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground font-medium">{acc.price} ₽</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-danger-soft"
                                                    onClick={() => onRemoveAccessory(item.id, acc.id)}
                                                    title="Удалить аксессуар"
                                                    aria-label={`Удалить аксессуар ${acc.name}`}
                                                >
                                                    <X className="h-3 w-3" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(unavailableIdsFromAPI.includes(item.id) || invalidItems.includes(item.id)) && (
                            <p className="text-sm text-destructive px-4 pb-2 pt-0">
                                Это оборудование недоступно на выбранные даты.
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
