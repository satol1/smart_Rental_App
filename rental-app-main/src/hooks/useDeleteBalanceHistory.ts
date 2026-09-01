// src/hooks/useDeleteBalanceHistory.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@/core/services";
import { toast } from "sonner";

/**
 * Хук для удаления записи из истории баланса (только для администраторов).
 */
export function useDeleteBalanceHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ historyId, userId }: { historyId: number; userId: number }) => {
            return UserService.deleteBalanceHistoryEntry(historyId);
        },
        onSuccess: (data, { historyId, userId }) => {
            toast.success("Запись успешно удалена из истории баланса");

            // Инвалидируем ВСЕ запросы, связанные с историей баланса
            void queryClient.invalidateQueries({ queryKey: ["balanceHistory"] });

            // Поскольку баланс пользователя изменился, инвалидируем кэш пользователей
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            
            // Также инвалидируем кэш текущего пользователя, если это он
            void queryClient.invalidateQueries({ queryKey: ["current_user"] });
            
            // Инвалидируем кэш конкретного пользователя для обновления его данных
            void queryClient.invalidateQueries({ queryKey: ["user", userId] });
        },
        onError: (error: any) => {
            const errorMessage = 
                error?.response?.data?.detail || 
                error?.message || 
                "Произошла ошибка при удалении записи";
            toast.error(errorMessage);
        }
    });
}
