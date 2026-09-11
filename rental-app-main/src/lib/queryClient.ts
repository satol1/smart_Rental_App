// src/lib/queryClient.ts
import { QueryClient, type QueryCacheNotifyEvent, Query } from "@tanstack/react-query"

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

function isUnauthorizedError(error: unknown): boolean {
    return error instanceof Error && error.message.includes("401")
}

function handleUnauthorized() {
    // Не жёсткая перезагрузка SPA: единый путь логаута — событие
    // 'auth-token-expired' (слушатель в main.tsx вызывает authStore.logout)
    window.dispatchEvent(new Event("auth-token-expired"))
}
