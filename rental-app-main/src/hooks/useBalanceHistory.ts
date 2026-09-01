// src/hooks/useBalanceHistory.ts

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { UserService } from "@/core/services";
import type { BalanceHistoryListResponse } from "@/types/balanceHistory";
import { useCurrentUser } from "./useProfile";

const PAGE_SIZE = 15;

/**
 * Хук для получения пагинированной истории баланса ТЕКУЩЕГО пользователя.
 */
export function useBalanceHistory(page: number) {
    const { data: user } = useCurrentUser();

    return useQuery<BalanceHistoryListResponse>({
        queryKey: ["balanceHistory", "me", page],
        queryFn: async () => {
            const skip = (page - 1) * PAGE_SIZE;
            return await UserService.getMyBalanceHistory(skip, PAGE_SIZE);
        },
        enabled: !!user, // Выполнять запрос только если пользователь авторизован
        staleTime: 60 * 1000, // 1 минута
    });
}

/**
 * Хук для получения пагинированной истории баланса ТЕКУЩЕГО пользователя с бесконечной прокруткой.
 */
export function useBalanceHistoryInfinite() {
    const { data: user } = useCurrentUser();

    return useInfiniteQuery({
        queryKey: ["balanceHistory", "me", "infinite"],
        queryFn: async ({ pageParam = 1 }) => {
            const skip = (pageParam - 1) * PAGE_SIZE;
            return await UserService.getMyBalanceHistory(skip, PAGE_SIZE);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loadedItems = allPages.reduce((total, page) => total + page.items.length, 0);
            const hasMore = loadedItems < lastPage.total;
            return hasMore ? allPages.length + 1 : undefined;
        },
        enabled: !!user, // Выполнять запрос только если пользователь авторизован
        staleTime: 60 * 1000, // 1 минута
    });
}

/**
 * Хук для получения пагинированной истории баланса ЛЮБОГО пользователя (для админов).
 */
export function useAdminBalanceHistory(userId: number, page: number) {
    const { data: currentUser } = useCurrentUser();
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    return useQuery<BalanceHistoryListResponse>({
        queryKey: ["balanceHistory", "admin", userId, page],
        queryFn: async () => {
            const skip = (page - 1) * PAGE_SIZE;
            return await UserService.getUserBalanceHistory(userId, skip, PAGE_SIZE);
        },
        enabled: isManager && !!userId, // Выполнять запрос только если текущий пользователь - админ/менеджер
        staleTime: 60 * 1000,
    });
}

/**
 * Хук для получения пагинированной истории баланса ЛЮБОГО пользователя с бесконечной прокруткой (для админов).
 */
export function useAdminBalanceHistoryInfinite(userId: number) {
    const { data: currentUser } = useCurrentUser();
    const isManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    return useInfiniteQuery({
        queryKey: ["balanceHistory", "admin", userId, "infinite"],
        queryFn: async ({ pageParam = 1 }) => {
            const skip = (pageParam - 1) * PAGE_SIZE;
            return await UserService.getUserBalanceHistory(userId, skip, PAGE_SIZE);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loadedItems = allPages.reduce((total, page) => total + page.items.length, 0);
            const hasMore = loadedItems < lastPage.total;
            return hasMore ? allPages.length + 1 : undefined;
        },
        enabled: isManager && !!userId, // Выполнять запрос только если текущий пользователь - админ/менеджер
        staleTime: 60 * 1000,
    });
}