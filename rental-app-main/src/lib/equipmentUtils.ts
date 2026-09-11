// src/lib/equipmentUtils.ts

import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo } from "@/types/availability";

/**
 * Константа для состояния оборудования, которое требует ремонта
 */
export const EQUIPMENT_UNDER_REPAIR_CONDITION = "Требует ремонта" as const;

/**
 * Определяет, находится ли оборудование в состоянии ремонта (недоступно для резервирования)
 * @param equipment - объект оборудования
 * @returns true, если оборудование недоступно для резервирования
 */
export function isEquipmentUnderRepair(equipment: Equipment): boolean {
    return equipment.condition === EQUIPMENT_UNDER_REPAIR_CONDITION;
}

/**
 * Определяет, доступно ли оборудование для резервирования
 * @param equipment - объект оборудования
 * @returns true, если оборудование доступно для резервирования
 */
export function isEquipmentAvailableForReservation(equipment: Equipment): boolean {
    return !isEquipmentUnderRepair(equipment);
}

/**
 * Получает CSS классы для карточки оборудования в зависимости от состояния
 * @param equipment - объект оборудования
 * @param isSelected - выбрано ли оборудование пользователем
 * @returns объект с CSS классами
 */
export function getEquipmentCardStyles(
    equipment: Equipment,
    isSelected: boolean = false
) {
    const isUnderRepair = isEquipmentUnderRepair(equipment);
    
    if (isUnderRepair) {
        return {
            background: "bg-muted/40 dark:bg-muted/20",
            border: "border-border/60 cursor-not-allowed opacity-65",
            text: "text-muted-foreground"
        };
    }
    
    if (isSelected) {
        return {
            background: "bg-card",
            border: "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/60 shadow-md",
            text: "text-foreground"
        };
    }
    
    return {
        background: "bg-card",
        border: "border-border/75 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        text: "text-foreground"
    };
}

/**
 * Получает текст для отображения состояния оборудования
 * @param equipment - объект оборудования
 * @returns строка с описанием состояния
 */
export function getEquipmentStatusText(equipment: Equipment): string {
    if (isEquipmentUnderRepair(equipment)) {
        return "временно недоступно";
    }
    return equipment.condition;
}

/**
 * Создает карту доступности оборудования из массива данных о доступности
 * @param availabilityData - массив данных о доступности оборудования
 * @returns объект с ключами equipment_id и значениями AvailabilityInfo
 */
export function createAvailabilityMap(availabilityData?: AvailabilityInfo[]): Record<number, AvailabilityInfo> {
    const map: Record<number, AvailabilityInfo> = {};
    availabilityData?.forEach((info) => {
        map[info.equipment_id] = info;
    });
    return map;
}
