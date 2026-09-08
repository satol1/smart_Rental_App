// src/lib/queryHelpers.ts
import { toast } from "sonner";
import i18n from "@/i18n";
export function handleQueryError(error) {
    const message = error instanceof Error
        ? error.message
        : typeof error === "string"
            ? error
            : i18n.t("errors.unknownQuery");
    toast.error(message);
    console.error("[Query error]", error);
}
/** Сужает unknown до axios-подобной ошибки */
export function isApiErrorLike(error) {
    return (typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object");
}
/**
 * Извлекает человекочитаемое сообщение из ошибки API.
 * Понимает detail строкой, массивом ошибок валидации и объектом { message }.
 * Если извлечь нечего — возвращает fallback.
 */
export function getApiErrorMessage(error, fallback) {
    if (!isApiErrorLike(error))
        return fallback;
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail)
        return detail;
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
