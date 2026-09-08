// src/hooks/features/useSmartFilters.ts
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { useCoreFilteringLogic } from './useCoreFilteringLogic';
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
export function useSmartFilters({ allEquipment, allAssociations }) {
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
