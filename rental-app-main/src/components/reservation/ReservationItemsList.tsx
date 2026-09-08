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
        <div className="space-y-4 pt-4">
            {items.map((item) => {
                const selectedAccessoryIds = selectedAccessories[item.id] || [];
                const selectedAccessoryDetails = item.accessories?.filter(acc =>
                    selectedAccessoryIds.includes(acc.id)
                ) || [];

                return (
                    <div
                        key={item.id}
                        className={`border rounded-lg overflow-hidden shadow-sm transition-all ${
                            unavailableIdsFromAPI.includes(item.id) || invalidItems.includes(item.id)
                                ? "border-red-400 bg-red-50"
                                : "border-gray-200 bg-white"
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
                            <div className="px-4 pb-3 pt-2 bg-slate-50 border-t border-dashed">
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    Доп. аксессуары:
                                </h4>
                                <ul className="space-y-1.5">
                                    {selectedAccessoryDetails.map(acc => (
                                        <li key={acc.id} className="flex items-center justify-between text-xs hover:bg-slate-100 p-1 rounded-md">
                                            <span className="text-gray-800">{acc.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500 font-medium">{acc.price} ₽</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
                            <p className="text-sm text-red-600 px-4 pb-2 pt-0">
                                Это оборудование недоступно на выбранные даты.
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    );
}