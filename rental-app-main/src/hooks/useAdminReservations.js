// src/hooks/useAdminReservations.ts
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import { ReservationService } from "@/core/services/ReservationService";
const ADMIN_RESERVATIONS_QUERY_KEY = ["adminReservations"];
export function useAdminReservations(params = {}) {
    const { limit = 10, status, search, periodType, periodOffset } = params;
    return useInfiniteQuery({
        queryKey: [...ADMIN_RESERVATIONS_QUERY_KEY, { status, search, periodType, periodOffset }],
        queryFn: async ({ pageParam = 0 }) => {
            const skip = pageParam * limit;
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
        mutationFn: (data) => ReservationService.createAdminReservation(data),
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
        mutationFn: (reservationId) => ReservationService.deleteAdminReservation(reservationId),
        onSuccess: () => {
            toast.success("Резерв успешно удален");
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении резерва"));
        },
    });
}
export function useBulkDeleteAdminReservations() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (reservationIds) => ReservationService.bulkDeleteAdminReservations(reservationIds),
        onSuccess: () => {
            toast.success("Выбранные резервы успешно удалены");
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при массовом удалении резервов"));
        },
    });
}
