// src/hooks/useAllEquipment.ts

import { useQuery } from "@tanstack/react-query";
import { EquipmentService } from "@/core/services";
import type { Equipment } from "@/types/equipment";

/**
 * Надежный справочник ВСЕГО оборудования в системе.
 * 
 * Этот хук загружает ВСЕ оборудование для:
 * - Форм и выпадающих списков в админ-панели
 * - Диалогов управления промокодами, ассоциациями, пачками
 * - Модальных окон, требующих полного списка
 * 
 * Ключевые отличия от useEquipment:
 * - **НИКОГДА не использует пагинацию** (загружает до 1000 записей).
 * - **ВСЕГДА использует `groupSimilar: false`**, чтобы получить полный список.
 * - **Кэшируется на долгое время**, так как полный список меняется редко.
 */
export function useAllEquipment() {
    return useQuery<Equipment[], Error>({
        // Уникальный ключ для кэширования этого запроса
        queryKey: ["allEquipment"], 
        queryFn: async () => {
            // Запрашиваем ОЧЕНЬ большую "страницу", чтобы получить все
            // **ВАЖНО: принудительно отключаем группировку**
            const response = await EquipmentService.getAllEquipment(0, 1000, { groupSimilar: false });
            return response.items; // Возвращаем только массив оборудования
        },
        staleTime: 60 * 60 * 1000, // Кэшируем данные на 1 час
        gcTime: 2 * 60 * 60 * 1000,  // Храним в кэше 2 часа
        refetchOnWindowFocus: false, // Не перезагружаем при фокусе окна
    });
}