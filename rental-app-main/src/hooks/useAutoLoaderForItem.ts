// src/hooks/useAutoLoaderForItem.ts
import { useEffect } from 'react';

interface AutoLoaderProps {
    items: { id: number }[]; // Массив уже загруженных элементов
    targetId: number | null;   // ID элемента, который мы ищем
    hasNextPage: boolean;
    isFetching: boolean;
    fetchNextPage: () => void;
}

export function useAutoLoaderForItem({ 
    items, 
    targetId, 
    hasNextPage, 
    isFetching, 
    fetchNextPage 
}: AutoLoaderProps) {
    useEffect(() => {
        // Если нет цели или уже идет загрузка, ничего не делаем
        if (!targetId || isFetching) {
            return;
        }

        // Проверяем, найден ли уже элемент
        const itemFound = items.some(item => item.id === targetId);

        // Если элемент НЕ найден и есть еще страницы для загрузки, запускаем загрузку
        if (!itemFound && hasNextPage) {
            fetchNextPage();
        }
    }, [items, targetId, hasNextPage, isFetching, fetchNextPage]); // Эффект перезапустится после каждой загрузки
}
