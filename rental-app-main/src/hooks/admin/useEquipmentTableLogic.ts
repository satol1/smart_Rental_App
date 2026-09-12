// src/hooks/admin/useEquipmentTableLogic.ts
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useProfile";
// ⛔️ Удаляем useEquipment, так как хук больше не будет загружать данные сам
// import { useEquipment } from "@/hooks/useEquipment";
import { useDeleteEquipment, useBulkDeleteEquipment } from "@/hooks/useAdminEquipment";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Equipment } from "@/types/equipment"; // ✅ Добавляем импорт типа

interface EquipmentAvailability {
    has_active_reservations: boolean;
    has_active_rentals: boolean;
    active_reservations_count: number;
    active_rentals_count: number;
}

// ✅ Хук теперь принимает массив оборудования как аргумент
export const useEquipmentTableLogic = (equipment: Equipment[] = []) => {
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    // ⛔️ Удаляем внутренний вызов useEquipment()
    // const { data: equipment = [], isLoading, error } = useEquipment();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    // Удаление — через явное подтверждение в UI (ConfirmationDialog), не window.confirm
    const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
    const [pendingBulkDeleteCount, setPendingBulkDeleteCount] = useState<number | null>(null);

    const deleteEquipmentMutation = useDeleteEquipment();
    const bulkDeleteMutation = useBulkDeleteEquipment();

    const isManager = currentUser?.role === "manager" || currentUser?.role === "admin";

    const filteredEquipment = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        return equipment.filter(item =>
            item.name.toLowerCase().includes(lowerCaseQuery) ||
            item.brand.toLowerCase().includes(lowerCaseQuery) ||
            item.equipment_type.toLowerCase().includes(lowerCaseQuery) ||
            (item.serial_number && item.serial_number.toLowerCase().includes(lowerCaseQuery))
        );
    }, [equipment, searchQuery]);

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? filteredEquipment.map(item => item.id) : []);
    };

    const handleSelectItem = (itemId: number, checked: boolean) => {
        setSelectedIds(prev =>
            checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
        );
    };

    const handleDelete = async (itemId: number) => {
        if (!isManager) return;

        try {
            const availability = await queryClient.fetchQuery<EquipmentAvailability>({
                queryKey: ["equipment-availability", itemId],
                queryFn: async () => (await api.get<EquipmentAvailability>(`/equipment/${itemId}/availability`)).data,
            });

            if (availability.has_active_reservations || availability.has_active_rentals) {
                const messages = [];
                if (availability.has_active_reservations) messages.push(`${availability.active_reservations_count} активных резервов`);
                if (availability.has_active_rentals) messages.push(`${availability.active_rentals_count} активных аренд`);
                toast.error(`Невозможно удалить: у оборудования есть ${messages.join(" и ")}.`);
                return;
            }

            const equipmentToDelete = filteredEquipment.find(item => item.id === itemId);
            setPendingDelete({ id: itemId, name: equipmentToDelete?.name ?? `#${itemId}` });
        } catch (err) {
            toast.error("Ошибка при проверке статуса оборудования.");
            console.error("Availability check failed:", err);
        }
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        deleteEquipmentMutation.mutate(pendingDelete.id);
        setPendingDelete(null);
    };

    const handleBulkDelete = () => {
        if (!isManager || selectedIds.length === 0) return;
        setPendingBulkDeleteCount(selectedIds.length);
    };

    const confirmBulkDelete = () => {
        if (pendingBulkDeleteCount == null || selectedIds.length === 0) {
            setPendingBulkDeleteCount(null);
            return;
        }
        bulkDeleteMutation.mutate(selectedIds, {
            onSuccess: () => setSelectedIds([]),
        });
        setPendingBulkDeleteCount(null);
    };

    const handlers = {
        setSearchQuery,
        handleSelectAll,
        handleSelectItem,
        handleDelete,
        handleBulkDelete
    };

    return {
        isManager,
        // ✅ Так как загрузка происходит выше, здесь мы считаем, что её нет
        isLoading: false,
        error: null,
        equipment,
        filteredEquipment,
        searchQuery,
        selectedIds,
        deleteEquipmentMutation,
        bulkDeleteMutation,
        handlers,
        pendingDelete,
        cancelDelete: () => setPendingDelete(null),
        confirmDelete,
        pendingBulkDeleteCount,
        cancelBulkDelete: () => setPendingBulkDeleteCount(null),
        confirmBulkDelete,
    };
};