// src/hooks/useAdminUsers.ts

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@/core/services";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import type { UserListResponse, UserPaymentRequest, AdminBalanceAdjustmentRequest } from "@/types/user";
import type { AdminUserCreateFormSchema, AdminUserUpdateSchema } from "@/lib/validationSchemas";

// Тип для данных, отправляемых при обновлении
type AdminUserUpdatePayload = {
    userId: number;
    data: AdminUserUpdateSchema;
};

// Создание пользователя (только администратор)
export function useAdminCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userData: AdminUserCreateFormSchema) => {
            return await UserService.createUser(userData);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast.success("Пользователь успешно создан");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании пользователя"));
        },
    });
}

// Обновление данных пользователя (администратор/менеджер)
export function useAdminUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, data }: AdminUserUpdatePayload) => {
            return await UserService.updateUser({ id: userId, ...data });
        },
        onSuccess: (updatedUser) => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast.success(`Профиль пользователя ${updatedUser.full_name} успешно обновлен.`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при обновлении профиля."));
        },
    });
}

// Получение всех пользователей с пагинацией (для менеджеров и администраторов)
export function useAdminUsers() {
    return useInfiniteQuery<UserListResponse>({
        queryKey: ["admin", "users"],
        queryFn: async ({ pageParam = 0 }) => {
            const skip = (pageParam as number) * 15; // 15 пользователей на страницу
            return await UserService.getAllUsers(skip, 15);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const totalLoaded = allPages.reduce((acc, page) => acc + page.items.length, 0);
            return totalLoaded < lastPage.total ? allPages.length : undefined;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// Получение пользователя по ID (только администратор)
export function useAdminUser(userId: number) {
    return useQuery({
        queryKey: ["user", userId],
        queryFn: () => UserService.getUserById(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 минут
    });
}


// Блокировка пользователя (только администратор)
export function useBlockUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: number) => {
            return await UserService.toggleUserStatus(userId, false);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast.success("Пользователь заблокирован");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при блокировке"));
        },
    });
}

// Разблокировка пользователя (только администратор)
export function useUnblockUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: number) => {
            return await UserService.toggleUserStatus(userId, true);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast.success("Пользователь разблокирован");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при разблокировке"));
        },
    });
}

// Удаление пользователя (только администратор)
export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: number) => {
            await UserService.deleteUser(userId);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            toast.success("Пользователь и связанный клиент удалены");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении"));
        },
    });
}

/**
 * Хук для добавления платежа и пополнения баланса пользователя.
 */
export function useAddUserPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, data }: { userId: number; data: UserPaymentRequest }) => {
            return await UserService.addUserPayment(userId, data);
        },
        onSuccess: (_updatedUser, { userId }) => {
            // Инвалидируем кэш списка пользователей
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

            // Инвалидируем кэш истории баланса для конкретного пользователя
            void queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "admin", userId]
            });

            // Инвалидируем кэш истории баланса для текущего пользователя (если он пополняет свой баланс)
            void queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "me"]
            });

            // Уведомление теперь показывается в компоненте с более детальной информацией
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при пополнении баланса."));
        },
    });
}

/**
 * Хук для корректировки баланса пользователя (начисление/списание).
 */
export function useAdjustUserBalance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, data }: { userId: number; data: AdminBalanceAdjustmentRequest }) => {
            return await UserService.adjustUserBalance(userId, data);
        },
        onSuccess: (_updatedUser, { userId }) => {
            // Инвалидируем кэш списка пользователей
            void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

            // Инвалидируем кэш истории баланса для конкретного пользователя
            void queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "admin", userId]
            });

            // Инвалидируем кэш истории баланса для текущего пользователя (если он корректирует свой баланс)
            void queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "me"]
            });

            // Уведомление теперь показывается в компоненте с более детальной информацией
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при корректировке баланса."));
        },
    });
}