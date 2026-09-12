// src/lib/catalogInvalidation.ts

import type { QueryClient } from "@tanstack/react-query";

/**
 * Публичные ключи каталога (этап 5.2 аудита 2026-09-12).
 * Админ-мутации справочников (пачки/аксессуары/бренды/ассоциации) меняют то,
 * что видит пользователь в каталоге и фильтрах, — эти ключи нужно инвалидировать.
 */
export const CATALOG_QUERY_KEYS = {
    /** Публичный каталог (infinite, useEquipment) */
    equipment: ["equipment"],
    /** Полный список оборудования для админ-форм (useAllEquipment) */
    allEquipment: ["allEquipment"],
    /** Публичный список систем брендов (useBrandSystems, staleTime 1 час) */
    brandSystems: ["brandSystems"],
    /** Публичный список ассоциаций (useAssociations) */
    associations: ["associations"],
    /** Метаданные фильтров каталога (useServerFilters) */
    filterMetadata: ["equipment-filter-metadata"],
} as const;

/** Инвалидировать ключи каталога, зависящие от состава/структуры данных */
export function invalidatePublicCatalog(queryClient: QueryClient) {
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.equipment });
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.allEquipment });
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.filterMetadata });
}
