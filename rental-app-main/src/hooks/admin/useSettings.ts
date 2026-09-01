// src/hooks/admin/useSettings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface Setting {
    key: string;
    value: string;
}

const SETTINGS_KEY = ["admin", "settings"];

export function useGetSettings() {
    return useQuery<Setting[]>({
        queryKey: SETTINGS_KEY,
        queryFn: async () => (await api.get("/admin/settings/")).data,
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (settings: Setting[]) => api.put("/admin/settings/", settings),
        onSuccess: () => {
            toast.success("Настройки успешно сохранены");
            void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
        },
        onError: (e: any) => toast.error(e.response?.data?.detail || "Ошибка сохранения"),
    });
}
