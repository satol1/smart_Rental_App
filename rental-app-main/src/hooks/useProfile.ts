import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAccessToken, clearAccessToken } from "@/core/services/tokenManager";
import { AuthService } from "@/core/services/AuthService";
import type { UserOut } from "@/types/user";
import { handleQueryError } from "@/lib/queryHelpers";

/**
 * Тип данных для обновления профиля пользователя
 */
type ProfileUpdatePayload = {
    full_name: string;
    email: string;
    phone?: string;
    telegram_username?: string;
};

/**
 * Тип ошибки API
 */
type APIError = {
    response?: {
        status?: number;
        data?: {
            detail?: string;
        };
    };
    message?: string;
};

/**
 * Хук для получения данных текущего пользователя
 * @returns Query объект с данными пользователя
 */
export function useCurrentUser() {
    return useQuery<UserOut | null, Error>({
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
                const res = await api.get<UserOut>("/auth/me");
                return res.data;
            } catch (error: unknown) {
                const apiError = error as APIError;
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

    return useMutation<void, Error, ProfileUpdatePayload>({
        mutationFn: async (data: ProfileUpdatePayload) => {
            try {
                await api.put("/user/", data);
            } catch (error: unknown) {
                console.error("[useProfileUpdate] Error updating profile:", error);
                handleQueryError(error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current_user"] });
        },
        onError: (error: Error) => {
            console.error("[useProfileUpdate] Mutation error:", error);
        },
    });
}
