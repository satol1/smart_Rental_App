// src/hooks/features/useServerFilters.ts

import { useMemo } from 'react';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useEquipment } from '@/hooks/useEquipment';
import { useDateStore } from '@/store/dateStore';
import type { Equipment } from '@/types/equipment';
import type { Association } from '@/types/association';
import type { CatalogItem, CatalogEquipmentItem, CatalogPackItem } from '@/types/pack';

interface UseServerFiltersReturn {
  // Объединенный список элементов каталога для отображения (оборудование + пачки)
  combinedItems: CatalogItem[];
  
  // Доступные опции для фильтров (теперь с сервера)
  availableTypes: string[];
  availableBrands: Array<{id: number, name: string}>;
  availableAssociations: Association[];
  
  // Флаг наличия активных фильтров
  hasActiveFilters: boolean;
  
  // Общее количество элементов
  totalCount: number;
  
  // Состояние загрузки
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

/**
 * Хук для серверной "умной" системы фильтрации с взаимозависимыми фильтрами.
 * 
 * Этот хук заменяет useSmartFilters и выполняет всю фильтрацию на сервере.
 * Сервер возвращает не только отфильтрованное оборудование, но и доступные
 * опции для каждого фильтра, что обеспечивает "умную" фильтрацию.
 * 
 * Логика работы:
 * 1. При выборе Ассоциации - сервер возвращает доступные Типы и Бренды
 * 2. При выборе Типа - сервер возвращает доступные Бренды и Ассоциации  
 * 3. При выборе Бренда - сервер возвращает доступные Типы и Ассоциации
 * 4. Все фильтры работают совместно для получения финального результата
 */
export function useServerFilters(): UseServerFiltersReturn {
  
  // Получаем текущие значения фильтров из store
  const { type, brandSystemId, associationId, availableOnly, groupSimilar } = useFilterStore();
  const { query } = useSearchStore();
  const { startDate, endDate } = useDateStore();

  // Используем useEquipment для получения отфильтрованных данных с сервера
  const {
    data: equipmentPages,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage
  } = useEquipment({
    query,
    type,
    brandSystemId,
    associationId,
    availableOnly,
    startDate,
    endDate,
    groupSimilar
  });

  // Извлекаем данные из ответа сервера
  const result = useMemo(() => {
    if (!equipmentPages?.pages.length) {
      // Возвращаем пустую структуру, если данных нет
      return {
        combinedItems: [],
        availableTypes: [],
        availableBrands: [],
        availableAssociations: [],
        hasActiveFilters: false,
        totalCount: 0,
      };
    }

    const firstPage = equipmentPages.pages[0];

    // ✅ ОБНОВЛЕНО: Теперь все элементы уже объединены на сервере в page.items
    const allItems = equipmentPages.pages.flatMap(page => page.items || []);

    // ✅ УПРОЩЕНО: Сервер уже возвращает правильно отсортированный список
    // Пачки всегда идут первыми, если включена группировка
    let combinedItems: CatalogItem[] = allItems as CatalogItem[];

    // ✅ ДОБАВЛЯЕМ entity_type для элементов, которые его не имеют (для обратной совместимости)
    combinedItems = combinedItems.map((item: any) => {
        if (!item.entity_type) {
            // Определяем тип по наличию equipment_ids (у пачек есть это поле)
            const entityType = 'equipment_ids' in item ? 'pack' : 'equipment';
            return { ...item, entity_type: entityType };
        }
        return item;
    });

    const hasActiveFilters = !!(
      (query && query.trim()) ||
      type || brandSystemId ||
      associationId || availableOnly || groupSimilar
    );

    return {
      combinedItems, // <--- ВАЖНО: Возвращаем новый объединенный массив
      availableTypes: firstPage.availableFilters?.types || [],
      availableBrands: firstPage.availableFilters?.brands || [],
      availableAssociations: firstPage.availableFilters?.associations?.map(assoc => ({
        ...assoc,
        description: undefined,
        equipment_ids: [] // Пустой массив, так как в фильтрах это не нужно
      })) || [],
      hasActiveFilters,
      totalCount: firstPage.total, // Общее количество берем из ответа API
    };
  }, [equipmentPages, query, type, brandSystemId, associationId, availableOnly, groupSimilar]);

  return {
    ...result,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  };
}
