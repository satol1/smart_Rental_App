// src/lib/queryHelpers.ts
import { toast } from "sonner"
import type { QueryClient } from "@tanstack/react-query"
import i18n from "@/i18n"

/**
 * Инвалидация всех кэшей занятости оборудования.
 * Реальные ключи запросов: availability-check / daily-availability /
 * equipment-availability — инвалидация по "availability" ничего не матчит.
 */
export function invalidateAvailability(queryClient: QueryClient) {
    void queryClient.invalidateQueries({ queryKey: ["availability-check"] })
    void queryClient.invalidateQueries({ queryKey: ["daily-availability"] })
    void queryClient.invalidateQueries({ queryKey: ["equipment-availability"] })
}

export function handleQueryError(error: unknown) {
    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : i18n.t("errors.unknownQuery")
    toast.error(message)
    console.error("[Query error]", error)
}

/* ------------------------------------------------------------------ */
/* Типизированное извлечение ошибок API (axios-подобных)               */
/* ------------------------------------------------------------------ */

/** Элемент массива detail в ошибках валидации FastAPI */
export interface ApiErrorDetailItem {
    msg?: string;
    loc?: Array<string | number>;
}

/** Минимальная структура ошибки axios с ответом API */
export interface ApiErrorLike {
    response?: {
        status?: number;
        data?: {
            detail?:
                | string
                | ApiErrorDetailItem[]
                | { message?: string; error_type?: string; suggested_end_date?: string };
        };
    };
}

/** Сужает unknown до axios-подобной ошибки */
export function isApiErrorLike(error: unknown): error is ApiErrorLike {
    return (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object"
    );
}

/**
 * Извлекает человекочитаемое сообщение из ошибки API.
 * Понимает detail строкой, массивом ошибок валидации и объектом { message }.
 * Если извлечь нечего — возвращает fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!isApiErrorLike(error)) return fallback;
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (Array.isArray(detail)) {
        const parts = detail
            .map((item) => (typeof item?.msg === "string" ? item.msg : ""))
            .filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : fallback;
    }
    if (detail && typeof detail === "object" && typeof detail.message === "string" && detail.message) {
        return detail.message;
    }
    return fallback;
}
