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
 * @param status - статус резервирования
 * @param isSelected - выбрано ли оборудование пользователем
 * @returns объект с CSS классами
 */
export function getEquipmentCardStyles(
    equipment: Equipment, 
    status: string = "available", 
    isSelected: boolean = false
) {
    const isUnderRepair = isEquipmentUnderRepair(equipment);
    
    if (isUnderRepair) {
        return {
            background: "bg-gray-100",
            border: "border-gray-300 cursor-not-allowed opacity-70",
            text: "text-gray-500"
        };
    }
    
    if (isSelected) {
        return {
            background: "bg-white",
            border: "ring-2 ring-offset-1 ring-sky-500 border-sky-400",
            text: "text-gray-900"
        };
    }
    
    return {
        background: "bg-white",
        border: "border-gray-200 hover:shadow-lg",
        text: "text-gray-900"
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
