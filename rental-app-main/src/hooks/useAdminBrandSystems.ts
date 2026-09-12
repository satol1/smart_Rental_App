// src/hooks/useAdminBrandSystems.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrandSystemService } from "@/core/services/BrandSystemService";
import type { BrandSystemCreate, BrandSystemUpdate, BrandSystemListResponse } from "@/types/brandSystem";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import { invalidatePublicCatalog, CATALOG_QUERY_KEYS } from "@/lib/catalogInvalidation";

const QUERY_KEY = ["admin", "brandSystems"];

/** Инвалидация админ-ключа + публичного фильтра брендов + каталога */
function invalidateBrandSystems(queryClient: ReturnType<typeof useQueryClient>) {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.brandSystems });
    invalidatePublicCatalog(queryClient);
}

export function useAdminBrandSystems() {
    return useQuery<BrandSystemListResponse, Error, BrandSystemListResponse["items"]>({
        queryKey: QUERY_KEY,
        queryFn: () => BrandSystemService.getAll(),
        select: (data) => data.items,
    });
}

export function useCreateBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: BrandSystemCreate) => BrandSystemService.create(data),
        onSuccess: () => {
            invalidateBrandSystems(queryClient);
            toast.success("Система бренда успешно создана");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка создания")),
    });
}

export function useUpdateBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: { id: number; data: BrandSystemUpdate }) => BrandSystemService.update(vars),
        onSuccess: () => {
            invalidateBrandSystems(queryClient);
            toast.success("Система бренда успешно обновлена");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка обновления")),
    });
}

export function useDeleteBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => BrandSystemService.delete(id),
        onSuccess: () => {
            invalidateBrandSystems(queryClient);
            toast.success("Система бренда удалена");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка удаления")),
    });
}
