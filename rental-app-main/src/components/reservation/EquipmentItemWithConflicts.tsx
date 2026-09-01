// src/components/reservation/EquipmentItemWithConflicts.tsx
import { Button } from "@/components/ui/button";
import { MinusCircle, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { formatDateRangeEuropean } from "@/lib/utils";
import type { AvailabilityInfo } from "@/types/availability";
import { isEquipmentUnderRepair, EQUIPMENT_UNDER_REPAIR_CONDITION } from "@/lib/equipmentUtils";

interface EquipmentItemWithConflictsProps {
    item: { id: number; label: string };
    isNew: boolean;
    hasConflict: boolean;
    availability?: AvailabilityInfo;
    onRemove?: (id: number) => void;
    disabled?: boolean;
    equipmentCondition?: string;
}

export default function EquipmentItemWithConflicts({
                                                       item,
                                                       isNew,
                                                       hasConflict,
                                                       availability,
                                                       onRemove,
                                                       disabled = false,
                                                       equipmentCondition
                                                   }: EquipmentItemWithConflictsProps) {

    const getStatusInfo = () => {
        // Проверяем состояние оборудования в первую очередь
        if (equipmentCondition === EQUIPMENT_UNDER_REPAIR_CONDITION) {
            return {
                icon: <AlertTriangle className="w-4 h-4" />,
                color: "text-amber-700",
                bgColor: "bg-amber-50 border-amber-200",
                status: "Временно недоступно",
                dateText: ""
            };
        }

        if (hasConflict && availability) {
            const dateRange = availability.start_date && availability.end_date
                ? formatDateRangeEuropean(availability.start_date, availability.end_date)
                : "";

            if (availability.status === "reserved") {
                return {
                    icon: <AlertTriangle className="w-4 h-4" />,
                    color: "text-yellow-600",
                    bgColor: "bg-yellow-50 border-yellow-200",
                    status: "Зарезервировано",
                    dateText: dateRange
                };
            } else if (availability.status === "rented") {
                return {
                    icon: <AlertTriangle className="w-4 h-4" />,
                    color: "text-red-600",
                    bgColor: "bg-red-50 border-red-200",
                    status: "В аренде",
                    dateText: dateRange
                };
            }
        }

        if (isNew) {
            return {
                icon: <Sparkles className="w-4 h-4" />,
                color: "text-green-600",
                bgColor: "bg-green-50 border-green-200",
                status: "Новая позиция",
                dateText: ""
            };
        }

        return {
            icon: <CheckCircle className="w-4 h-4" />,
            color: "text-gray-600",
            bgColor: "bg-gray-50 border-gray-200",
            status: "Доступно",
            dateText: ""
        };
    };

    const statusInfo = getStatusInfo();

    return (
        <div className={`flex justify-between items-start p-3 rounded-md border transition-colors ${statusInfo.bgColor}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <div className={`flex-shrink-0 mt-0.5 ${statusInfo.color}`}>
                        {statusInfo.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {item.label}
                        </div>

                        <div className={`text-xs ${statusInfo.color} mt-1`}>
                            {statusInfo.status}
                            {statusInfo.dateText && (
                                <span className="ml-1 font-normal">
                  ({statusInfo.dateText})
                </span>
                            )}
                        </div>

                        {hasConflict && (
                            <div className="text-xs text-red-600 mt-1 font-medium">
                                ⚠️ Конфликт: оборудование недоступно на выбранные даты
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {onRemove && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.id)}
                    disabled={disabled}
                    className={`ml-2 h-8 w-8 flex-shrink-0 hover:text-red-700 ${
                        disabled
                            ? "text-gray-400 cursor-not-allowed"
                            : hasConflict
                                ? "text-red-500 hover:bg-red-100"
                                : "text-gray-500 hover:bg-gray-100"
                    }`}
                    title="Удалить из резерва"
                >
                    <MinusCircle className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}