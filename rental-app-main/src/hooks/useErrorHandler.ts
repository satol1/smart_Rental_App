// src/hooks/useErrorHandler.ts
import { useCallback } from "react"

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
            throw new Error("Произошла неизвестная ошибка")
        }
    }, [])
}
