// src/lib/queryClient.ts
import { QueryClient, type QueryCacheNotifyEvent, Query } from "@tanstack/react-query"
import { isAxiosError } from "axios"

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: true,
            retry: 1
        }
    }
})

// 🔧 Подписка на события ошибок в кэше
queryClient.getQueryCache().subscribe((event: QueryCacheNotifyEvent) => {
    // Проверяем, содержит ли событие объект Query
    const query = 'query' in event ? (event as { query: Query }).query : undefined

    if (
        query?.state.status === "error" &&
        isUnauthorizedError(query.state.error)
    ) {
        handleUnauthorized()
    }
})

/**
 * 401 определяем по СТАТУСУ ответа, а не по подстроке "401" в message
 * (этап 6.6 аудита): текст ошибки менялся с бэкендом и молча ломал логаут.
 */
function isUnauthorizedError(error: unknown): boolean {
    if (isAxiosError(error)) {
        return error.response?.status === 401
    }
    // Не-axios ошибки: fallback на прежнюю эвристику (интерсепторы оборачивают)
    return error instanceof Error && /\b401\b/.test(error.message)
}

function handleUnauthorized() {
    // Не жёсткая перезагрузка SPA: единый путь логаута — событие
    // 'auth-token-expired' (слушатель в main.tsx вызывает authStore.logout)
    window.dispatchEvent(new Event("auth-token-expired"))
}
