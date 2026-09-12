// src/hooks/useAdminReservations.ts

import { useInfiniteQuery, useMutation, useQueryClient, type QueryFunctionContext } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import { ReservationService, type AdminReservationCreatePayload } from "@/core/services/ReservationService";
import type { AdminReservationListResponse } from "@/types/reservation";
import type { PeriodType } from "@/types/period";


export interface AdminReservationsParams {
    status?: "active" | "completed" | "fulfilled" | "cancelled" | "overdue" | null;
    search?: string;
    limit?: number;
    periodType?: PeriodType;
    periodOffset?: number;
}

const ADMIN_RESERVATIONS_QUERY_KEY = ["adminReservations"];

export function useAdminReservations(params: AdminReservationsParams = {}) {
    const { limit = 10, status, search, periodType, periodOffset } = params;

    return useInfiniteQuery<AdminReservationListResponse, Error>({
        queryKey: [...ADMIN_RESERVATIONS_QUERY_KEY, { status, search, periodType, periodOffset }],
        queryFn: async ({ pageParam = 0 }: QueryFunctionContext) => {
            const skip = (pageParam as number) * limit;
            return await ReservationService.getAdminReservations({
                status, search, periodType, periodOffset, skip, limit
            });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loadedItems = allPages.reduce((acc, page) => acc + page.items.length, 0);
            if (loadedItems < lastPage.total) {
                return allPages.length;
            }
            return undefined;
        },
        staleTime: 60 * 1000,
    });
}

export function useCreateAdminReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AdminReservationCreatePayload) => ReservationService.createAdminReservation(data),
        onSuccess: () => {
            toast.success("Резерв успешно создан");
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании резерва"));
        },
    });
}

export function useDeleteAdminReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reservationId: number) => ReservationService.deleteAdminReservation(reservationId),
        onSuccess: () => {
            toast.success("Резерв успешно отменен");
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при отмене резерва"));
        },
    });
}

export function useBulkDeleteAdminReservations() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reservationIds: number[]) => ReservationService.bulkDeleteAdminReservations(reservationIds),
        onSuccess: () => {
            toast.success("Выбранные резервы успешно отменены");
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при массовой отмене резервов"));
        },
    });
}