// src/types/equipmentCard.ts

import type { Equipment } from "./equipment";
import type { EquipmentStatus, DayStatus } from "./availability";

/**
 * Базовые пропсы для карточки оборудования.
 * Определяет основные параметры для отображения и поведения карточки.
 */
export interface EquipmentCardBaseProps {
    equipment: Equipment;
    status: EquipmentStatus | "my_reservation" | "added";
    startDate?: string;
    endDate?: string;
    dailyStatus?: Record<string, DayStatus>;
    isSelected: boolean;
    onToggleSelection: () => void;
    isAccessorySelected: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    isCalculatorVisible: boolean;
    accessoriesDailyRate: number;
    totalDiscountPercentage: number;
    discountData: {
        days: number;
        percentage: number;
        priceBefore: number;
        priceAfter: number;
    };
}

/**
 * Упрощенные пропсы для карточки оборудования.
 * Используется когда вся логика инкапсулирована в ViewModel-хуке.
 */
export interface EquipmentCardSimpleProps {
    equipment: Equipment;
    dailyStatus?: Record<string, DayStatus>;
    // Опциональные внешние обработчики для переопределения поведения по умолчанию
    onToggleSelection?: (equipment: Equipment) => void;
    onToggleAccessory?: (equipmentId: number, accessoryId: number) => void;
    isAccessorySelected?: (equipmentId: number, accessoryId: number) => boolean;
    // Опциональные даты для переопределения глобального состояния
    startDate?: string | Date;
    endDate?: string | Date;
    // Опциональный статус для переопределения проверки доступности
    status?: EquipmentStatus | "my_reservation" | "added";
}

/**
 * Полная конфигурация для карточки оборудования.
 * Включает базовые пропсы плюс дополнительные функции.
 */
export interface EquipmentCardConfig extends EquipmentCardBaseProps {
    handleSetStartDate: (date: Date) => void;
}

/**
 * Опции для создания конфигурации карточки оборудования.
 * Позволяет переопределить поведение по умолчанию.
 */
export interface EquipmentCardOptions {
    equipment: Equipment;
    // Опциональные пропсы для работы с локальным состоянием (например, в PackDetailsModal)
    isSelected?: boolean;
    onToggleSelection?: (equipment: Equipment) => void;
    isAccessorySelected?: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory?: (equipmentId: number, accessoryId: number) => void;
    // Опциональные даты для проверки доступности (если не переданы, используются из useDateStore)
    startDate?: string | Date;
    endDate?: string | Date;
    // Опциональный статус (если не передан, проверяется через useAvailabilityCheck)
    status?: EquipmentStatus | "my_reservation" | "added";
    // Опциональные данные о ежедневной доступности
    dailyStatus?: Record<string, DayStatus>;
}
