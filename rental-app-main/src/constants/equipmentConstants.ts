// src/constants/equipmentConstants.ts

/**
 * Список возможных состояний оборудования.
 * Используется для выпадающих списков в формах и для валидации.
 */
export const EQUIPMENT_CONDITIONS: readonly string[] = [
    "Великолепно",
    "Отлично",
    "Хорошо",
    "Удовлетворительно",
    "Требует ремонта",
];

/**
 * Утилита для получения Tailwind CSS классов для стилизации состояния оборудования.
 * @param condition Строка с названием состояния.
 * @returns Строка с CSS классами для фона и текста.
 */
export function getConditionVariantClass(condition: string): string {
    switch (condition) {
        case "Великолепно":
            return "bg-green-100 text-green-800";
        case "Отлично":
            return "bg-sky-100 text-sky-800";
        case "Хорошо":
            return "bg-yellow-100 text-yellow-800";
        case "Удовлетворительно":
            return "bg-orange-100 text-orange-800";
        case "Требует ремонта":
            return "bg-gray-200 text-gray-600 border border-gray-300";
        default:
            return "bg-gray-100 text-gray-800";
    }
};