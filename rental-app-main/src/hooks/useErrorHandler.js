// src/hooks/useErrorHandler.ts
import { useCallback } from "react";
import i18n from "@/i18n";
/**
 * Хук, пробрасывающий ошибку во внешний ErrorBoundary через throw.
 * Вызывается вручную из async-контекста.
 */
export const useErrorHandler = () => {
    return useCallback((error) => {
        if (error instanceof Error) {
            throw error;
        }
        else {
            throw new Error(i18n.t("errors.unknown"));
        }
    }, []);
};
