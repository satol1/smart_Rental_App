// src/hooks/useAdminBrandSystems.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrandSystemService } from "@/core/services/BrandSystemService";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
const QUERY_KEY = ["admin", "brandSystems"];
export function useAdminBrandSystems() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => BrandSystemService.getAll(),
        select: (data) => data.items,
    });
}
export function useCreateBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => BrandSystemService.create(data),
        onSuccess: () => {
            toast.success("Система бренда успешно создана");
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка создания")),
    });
}
export function useUpdateBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars) => BrandSystemService.update(vars),
        onSuccess: () => {
            toast.success("Система бренда успешно обновлена");
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка обновления")),
    });
}
export function useDeleteBrandSystem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => BrandSystemService.delete(id),
        onSuccess: () => {
            toast.success("Система бренда удалена");
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка удаления")),
    });
}
