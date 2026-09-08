// src/components/ReserveEquipmentCard.tsx
import { useState } from "react";
import { Trash2, Paperclip, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo, EquipmentStatus } from "@/types/availability";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateRangeEuropean } from "@/lib/utils";

type Props = {
    equipment: Equipment;
    availability?: AvailabilityInfo;
    onRemove: (id: number) => void;
    // ✅ ДОБАВЛЕНЫ НОВЫЕ СВОЙСТВА
    isAccessorySelected: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
};

const statusTextMap: Record<EquipmentStatus | string, string> = {
    available: "Свободно",
    reserved: "В резерве (другим)",
    rented: "В аренде (другим)",
    my_reservation: "В этом резерве",
};

const statusColorMap: Record<EquipmentStatus | string, string> = {
    available: "text-green-600",
    reserved: "text-rose-500",
    rented: "text-red-600",
    my_reservation: "text-sky-700",
};

const bgColorMap: Record<EquipmentStatus | string, string> = {
    available: "bg-white",
    reserved: "bg-rose-50 border-rose-200",
    rented: "bg-rose-100 border-rose-300",
    my_reservation: "bg-sky-50 border-sky-200",
};

function formatDateRange(start?: string | null, end?: string | null) {
    if (!start || !end) return "";
    return `(${formatDateRangeEuropean(start, end)})`;
}

export default function ReserveEquipmentCard({
                                                 equipment,
                                                 availability,
                                                 onRemove,
                                                 // ✅ ПОЛУЧАЕМ НОВЫЕ СВОЙСТВА
                                                 isAccessorySelected,
                                                 onToggleAccessory
                                             }: Props) {
    const status = availability?.status ?? "available";
    const statusText = statusTextMap[status] || "Неизвестный статус";
    const colorClass = statusColorMap[status] || "text-gray-500";
    const bgClass = bgColorMap[status] || "bg-gray-50";
    const dateRange = (status === "reserved" || status === "rented")
        ? formatDateRange(availability?.start_date, availability?.end_date)
        : "";
    const isExternalConflict = status === "reserved" || status === "rented";

    // ✅ СОСТОЯНИЕ ДЛЯ ОТОБРАЖЕНИЯ СПИСКА АКСЕССУАРОВ
    const [showAccessories, setShowAccessories] = useState(false);

    return (
        <Card
            className={`rounded-xl px-4 py-4 sm:px-6 shadow-sm transition border w-full flex flex-col ${bgClass}`}
        >
            <CardContent className="p-0 flex-1 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold mb-1">{equipment.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">
                        {equipment.brand} • {equipment.equipment_type}
                    </p>
                    <p className="text-xs sm:text-sm mb-1">
                        Состояние: <strong>{equipment.condition}</strong>
                    </p>
                    <p className="text-sm sm:text-base font-bold mb-1">{equipment.daily_rate} ₽ / день</p>

                    <p className={`text-sm font-semibold mt-2 ${colorClass}`}>
                        {statusText}
                        {dateRange && <span className="ml-1 text-xs font-normal">{dateRange}</span>}
                    </p>

                    {/* ✅ НАЧАЛО БЛОКА ВЫБОРА АКСЕССУАРОВ */}
                    {equipment.accessories && equipment.accessories.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                            <button
                                className="w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-sky-700 p-1 -m-1 rounded"
                                onClick={() => setShowAccessories(prev => !prev)}
                            >
                                <span className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" />
                                    Добавить аксессуары ({equipment.accessories.length})
                                </span>
                                <ChevronDown className={`w-5 h-5 transition-transform ${showAccessories ? 'rotate-180' : ''}`} />
                            </button>
                            {showAccessories && (
                                <div className="mt-2 space-y-2 pl-1 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                    {equipment.accessories.map(acc => (
                                        <div key={acc.id} className="flex items-center justify-between p-1 rounded hover:bg-gray-50">
                                            <Label htmlFor={`reserve-acc-${equipment.id}-${acc.id}`} className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                                                <Checkbox
                                                    id={`reserve-acc-${equipment.id}-${acc.id}`}
                                                    checked={isAccessorySelected(equipment.id, acc.id)}
                                                    onCheckedChange={() => onToggleAccessory(equipment.id, acc.id)}
                                                />
                                                {acc.name}
                                            </Label>
                                            <span className="text-xs text-gray-500">{acc.price} ₽</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {/* ✅ КОНЕЦ БЛОКА ВЫБОРА АКСЕССУАРОВ */}
                </div>

                <button
                    onClick={() => onRemove(equipment.id)}
                    className={`rounded px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium flex items-center gap-1 mt-1 self-start sm:self-center 
                        ${isExternalConflict
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-slate-500 text-white hover:bg-slate-600"
                    }`}
                    title="Удалить из резерва"
                >
                    <Trash2 size={14} className="sm:size-4" />
                    Удалить
                </button>
            </CardContent>
        </Card>
    );
}