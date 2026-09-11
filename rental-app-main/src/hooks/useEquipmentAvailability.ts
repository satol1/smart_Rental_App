import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface EquipmentAvailability {
    has_active_reservations: boolean;
    has_active_rentals: boolean;
    active_reservations_count: number;
    active_rentals_count: number;
}

export function useEquipmentAvailability(equipmentId: number) {
    return useQuery({
        queryKey: ["equipment-availability", equipmentId],
        queryFn: async () => {
            const response = await api.get<EquipmentAvailability>(`/equipment/${equipmentId}/availability`);
            return response.data;
        },
    });
} 