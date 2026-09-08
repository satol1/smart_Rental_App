import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
export function useEquipmentAvailability(equipmentId) {
    return useQuery({
        queryKey: ["equipment-availability", equipmentId],
        queryFn: async () => {
            const response = await api.get(`/equipment/${equipmentId}/availability`);
            return response.data;
        },
    });
}
