// src/components/equipment-card/constants.ts

import type { EquipmentStatus } from "@/types/availability";

type StatusKey = EquipmentStatus | "my_reservation" | "added";

// Стили ТОЛЬКО для цвета текста
export const STATUS_TEXT_STYLES: Record<StatusKey, string> = {
    available: "text-green-600",
    reserved: "text-reserved-foreground",
    rented: "text-red-600",
    my_reservation: "text-sky-700",
    added: "text-emerald-600",
};

// Стили ТОЛЬКО для цвета фона
export const STATUS_BACKGROUND_STYLES: Record<StatusKey, string> = {
    available: "bg-white",
    reserved: "bg-white",
    rented: "bg-white",
    my_reservation: "bg-sky-50",
    added: "bg-emerald-50",
};

// Текстовые описания для статусов
export const STATUS_TEXTS: Record<StatusKey, string> = {
    available: "Свободно",
    reserved: "В резерве",
    rented: "В аренде",
    my_reservation: "В этом резерве",
    added: "Добавлено",
};

// Вспомогательная функция для получения правильного окончания слова "день"
export const getDayEnding = (num: number): string => {
    if (num > 10 && num < 20) return 'дней';
    const lastDigit = num % 10;
    if (lastDigit === 1) return 'день';
    if (lastDigit > 1 && lastDigit < 5) return 'дня';
    return 'дней';
};