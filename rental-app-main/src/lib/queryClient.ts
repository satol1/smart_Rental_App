// src/lib/queryClient.ts
import { QueryClient, QueryCacheNotifyEvent, Query } from "@tanstack/react-query"

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
    localStorage.removeItem("access_token")
    window.location.href = "/"
}
