import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAccessToken, clearAccessToken } from "@/core/services/tokenManager";
import { AuthService } from "@/core/services/AuthService";
import { handleQueryError } from "@/lib/queryHelpers";
/**
 * Хук для получения данных текущего пользователя
 * @returns Query объект с данными пользователя
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: ["current_user"],
        queryFn: async () => {
            // Проверяем наличие токена перед запросом
            let accessToken = getAccessToken();
            if (!accessToken) {
                // Пытаемся бесшумно восстановить токен из refresh-cookie
                accessToken = await AuthService.ensureAccessToken();
                if (!accessToken) {
                    return null;
                }
            }
            try {
                const res = await api.get("/auth/me");
                return res.data;
            }
            catch (error) {
                const apiError = error;
                if (apiError.response?.status === 401) {
                    // Очищаем недействительный токен
                    clearAccessToken();
                    return null;
                }
                console.error("[useCurrentUser] Error fetching user data:", apiError);
                handleQueryError(error);
                throw error;
            }
        },
        staleTime: 1000 * 60 * 10, // кэш на 10 минут
        retry: (failureCount, error) => {
            // Не повторяем запрос при 401 ошибке
            if (error instanceof Error && error.message.includes("401")) {
                return false;
            }
            return failureCount < 3;
        },
        // Всегда выполняем запрос: при отсутствии access-токена внутри queryFn
        // произойдёт "тихий" refresh через AuthService.ensureAccessToken()
        enabled: true,
    });
}
/**
 * Хук для обновления данных профиля пользователя
 * @returns Mutation объект для обновления профиля
 */
export function useProfileUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            try {
                await api.put("/user/", data);
            }
            catch (error) {
                console.error("[useProfileUpdate] Error updating profile:", error);
                handleQueryError(error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current_user"] });
        },
        onError: (error) => {
            console.error("[useProfileUpdate] Mutation error:", error);
        },
    });
}
