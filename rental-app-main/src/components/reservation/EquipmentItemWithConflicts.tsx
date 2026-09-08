// src/components/reservation/EquipmentItemWithConflicts.tsx
import { Button } from "@/components/ui/button";
import { MinusCircle, AlertTriangle, CheckCircle, PlusCircle } from "lucide-react";
import { formatDateRangeEuropean } from "@/lib/utils";
import type { AvailabilityInfo } from "@/types/availability";
import { EQUIPMENT_UNDER_REPAIR_CONDITION } from "@/lib/equipmentUtils";

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
                color: "text-warning",
                bgColor: "bg-warning-soft border-warning/20",
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
                    color: "text-warning",
                    bgColor: "bg-warning-soft border-warning/20",
                    status: "Зарезервировано",
                    dateText: dateRange
                };
            } else if (availability.status === "rented") {
                return {
                    icon: <AlertTriangle className="w-4 h-4" />,
                    color: "text-destructive",
                    bgColor: "bg-danger-soft border-destructive/20",
                    status: "В аренде",
                    dateText: dateRange
                };
            }
        }

        if (isNew) {
            return {
                icon: <PlusCircle className="w-4 h-4" />,
                color: "text-success",
                bgColor: "bg-success-soft border-success/20",
                status: "Новая позиция",
                dateText: ""
            };
        }

        return {
            icon: <CheckCircle className="w-4 h-4" />,
            color: "text-muted-foreground",
            bgColor: "bg-muted border-border",
            status: "Доступно",
            dateText: ""
        };
    };

    const statusInfo = getStatusInfo();

    return (
        <div className={`flex justify-between items-start gap-2 py-2`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <div className={`flex-shrink-0 mt-0.5 ${statusInfo.color}`}>
                        {statusInfo.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground break-words">
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
                            <div className="text-xs text-destructive mt-1 font-medium">
                                Конфликт: оборудование недоступно на выбранные даты
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
                    aria-label={`Удалить ${item.label} из резерва`}
                    className={`ml-2 h-8 w-8 flex-shrink-0 hover:text-destructive ${
                        disabled
                            ? "text-muted-foreground cursor-not-allowed"
                            : hasConflict
                                ? "text-destructive hover:bg-danger-soft"
                                : "text-muted-foreground hover:bg-muted"
                    }`}
                    title="Удалить из резерва"
                >
                    <MinusCircle className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}
