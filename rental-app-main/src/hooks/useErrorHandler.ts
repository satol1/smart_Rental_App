// src/hooks/useErrorHandler.ts
import { useCallback } from "react"
import i18n from "@/i18n"

type UseErrorHandler = () => (error: unknown) => void

/**
 * Хук, пробрасывающий ошибку во внешний ErrorBoundary через throw.
 * Вызывается вручную из async-контекста.
 */
export const useErrorHandler: UseErrorHandler = () => {
    return useCallback((error: unknown) => {
        if (error instanceof Error) {
            throw error
        } else {
            throw new Error(i18n.t("errors.unknown"))
        }
    }, [])
}
