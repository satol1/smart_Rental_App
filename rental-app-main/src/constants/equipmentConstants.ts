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
            return "bg-success-soft text-success";
        case "Отлично":
            return "bg-info-soft text-primary";
        case "Хорошо":
            return "bg-warning-soft text-warning";
        case "Удовлетворительно":
            return "bg-pastel-amber text-pastel-amber-fg";
        case "Требует ремонта":
            return "bg-muted text-muted-foreground border border-border";
        default:
            return "bg-muted text-foreground";
    }
};