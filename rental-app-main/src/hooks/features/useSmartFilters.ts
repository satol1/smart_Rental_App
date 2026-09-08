// src/hooks/features/useSmartFilters.ts

import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useCoreFilteringLogic } from './useCoreFilteringLogic';
import type { Equipment } from '@/types/equipment';
import type { Association } from '@/types/association';

interface UseSmartFiltersProps {
  allEquipment: Equipment[];
  allAssociations: Association[];
}

interface UseSmartFiltersReturn {
  // Отфильтрованный список оборудования для отображения
  filteredEquipment: Equipment[];
  
  // Доступные опции для фильтров
  availableTypes: string[];
  availableBrands: string[];
  availableAssociations: Association[];
  
  // Флаг наличия активных фильтров
  hasActiveFilters: boolean;
}

/**
 * Хук для "умной" системы фильтрации с взаимозависимыми фильтрами.
 * 
 * Этот хук является оберткой над useCoreFilteringLogic, которая:
 * 1. Получает состояние фильтров из Zustand store
 * 2. Передает это состояние в централизованную логику фильтрации
 * 3. Возвращает результат без изменений
 * 
 * Логика работы:
 * 1. При выборе Ассоциации - обновляются доступные Типы и Бренды
 * 2. При выборе Типа - обновляются доступные Бренды и Ассоциации  
 * 3. При выборе Бренда - обновляются доступные Типы и Ассоциации
 * 4. Все фильтры работают совместно для получения финального результата
 */
export function useSmartFilters({ 
  allEquipment, 
  allAssociations 
}: UseSmartFiltersProps): UseSmartFiltersReturn {
  
  // Получаем текущие значения фильтров из store
  const { type, brand, associationId } = useFilterStore();
  const { query } = useSearchStore();

  // Используем централизованную логику фильтрации
  const coreFilteringResult = useCoreFilteringLogic({
    allEquipment,
    allAssociations,
    filters: {
      type,
      brand,
      associationId,
      query
    }
  });

  return coreFilteringResult;
}
