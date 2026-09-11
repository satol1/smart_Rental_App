// src/hooks/features/useServerFilters.ts

import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useEquipment } from '@/hooks/useEquipment';
import { useDateStore } from '@/store/dateStore';
import { useAssociations } from '@/hooks/useAssociations';
import { EquipmentService } from '@/core/services/EquipmentService';

import type { Association } from '@/types/association';
import type { CatalogItem } from '@/types/pack';

interface UseServerFiltersReturn {
  // Объединенный список элементов каталога для отображения (оборудование + пачки)
  combinedItems: CatalogItem[];

  // Доступные опции для фильтров (метаданные с сервера + ассоциации)
  availableTypes: string[];
  availableBrands: Array<{id: number, name: string}>;
  availableAssociations: Association[];

  // Флаг наличия активных фильтров
  hasActiveFilters: boolean;

  // Общее количество элементов
  totalCount: number;

  // Состояние загрузки
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
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
 * 1. Опции фильтров запрашиваются отдельным metadata-запросом БЕЗ дат и поиска —
 *    они переживают пустые результаты и смену дат и не "мигают" при загрузке
 * 2. При выборе Ассоциации - сервер возвращает доступные Типы и Бренды
 * 3. При выборе Типа - сервер возвращает доступные Бренды и Ассоциации
 * 4. Все фильтры работают совместно для получения финального результата
 */
export function useServerFilters(): UseServerFiltersReturn {

  // Получаем текущие значения фильтров из store
  const { type, brandSystemId, associationId, availableOnly, groupSimilar } = useFilterStore();
  const { query } = useSearchStore();
  const { startDate, endDate } = useDateStore();

  // Ассоциации для селектора приходят из отдельного справочника
  const { data: associations = [] } = useAssociations();

  // Metadata-запрос: только структурные фильтры, без поисковой строки и дат.
  // Даты и поиск не должны сужать доступные опции, а пустой отфильтрованный
  // ответ не должен очищать селекты.
  const { data: metadataPage } = useQuery({
    queryKey: ['equipment-filter-metadata', { type, brandSystemId, associationId, availableOnly }],
    queryFn: () => EquipmentService.getAllEquipment(0, 1, {
      type,
      brandSystemId,
      associationId,
      availableOnly,
    }),
    staleTime: 5 * 60 * 1000,
    // Держим предыдущие опции при смене фильтров — селекты не мигают пустыми
    placeholderData: keepPreviousData,
  });

  // Используем useEquipment для получения отфильтрованных данных с сервера
  const {
    data: equipmentPages,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError,
    refetch,
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

  // Флаг считается из store независимо от наличия данных,
  // чтобы оставаться верным во время загрузки первой страницы
  const hasActiveFilters = !!(
    (query && query.trim()) ||
    type || brandSystemId ||
    associationId || availableOnly
  );

  // Извлекаем данные из ответа сервера
  const result = useMemo(() => {
    if (!equipmentPages?.pages.length) {
      // Возвращаем пустую структуру, если данных нет
      return {
        combinedItems: [],
        availableTypes: metadataPage?.availableFilters?.types || [],
        availableBrands: metadataPage?.availableFilters?.brands || [],
        availableAssociations: associations,
        hasActiveFilters,
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
    combinedItems = combinedItems.map((item) => {
        if (!item.entity_type) {
            // Определяем тип по наличию equipment_ids (у пачек есть это поле)
            const entityType = 'equipment_ids' in item ? 'pack' : 'equipment';
            return { ...(item as object), entity_type: entityType } as CatalogItem;
        }
        return item;
    });

    return {
      combinedItems, // <--- ВАЖНО: Возвращаем новый объединенный массив
      availableTypes: metadataPage?.availableFilters?.types || [],
      availableBrands: metadataPage?.availableFilters?.brands || [],
      availableAssociations: associations,
      hasActiveFilters,
      totalCount: firstPage.total, // Общее количество элементов берем из ответа API
    };
  }, [equipmentPages, metadataPage, associations, hasActiveFilters]);

  return {
    ...result,
    isLoading,
    isError,
    refetch: () => { void refetch(); },
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  };
}
