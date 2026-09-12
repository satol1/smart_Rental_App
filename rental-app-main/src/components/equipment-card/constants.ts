// src/components/equipment-card/constants.ts

import type { EquipmentStatus } from "@/types/availability";

type StatusKey = EquipmentStatus | "my_reservation" | "added";

// Стили ТОЛЬКО для цвета текста
export const STATUS_TEXT_STYLES: Record<StatusKey, string> = {
    available: "text-success",
    reserved: "text-reserved-foreground",
    rented: "text-destructive",
    my_reservation: "text-primary",
    added: "text-success",
};

// Стили ТОЛЬКО для цвета фона
export const STATUS_BACKGROUND_STYLES: Record<StatusKey, string> = {
    available: "bg-card",
    reserved: "bg-card",
    rented: "bg-card",
    my_reservation: "bg-info-soft",
    added: "bg-success-soft",
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