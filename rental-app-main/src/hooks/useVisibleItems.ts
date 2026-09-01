import { useState, useEffect } from 'react';

/**
 * Управляет количеством видимых элементов в списке с учетом фильтрации.
 * @param totalCount Общее количество элементов в отфильтрованном списке.
 */
export function useVisibleItems(totalCount: number) {
    // `intendedSize` — это количество элементов, которое пользователь *хочет* видеть (например, после нажатия кнопки "24").
    const [intendedSize, setIntendedSize] = useState(12);

    // `visibleCount` — это фактическое количество элементов для отображения, ограниченное `totalCount`.
    const [visibleCount, setVisibleCount] = useState(12);

    // `increaseVisibleCount` обновляет намерение пользователя увидеть больше элементов.
    const increaseVisibleCount = (step: number = 12) => {
        setIntendedSize((prev) => prev + step);
    };

    // `setVisibility` (переименована для ясности в `setIntendedSize`) вызывается кнопками "12", "24", и т.д.
    const setVisibility = (count: number) => {
        setIntendedSize(count);
    };

    // Этот useEffect синхронизирует фактическое количество видимых элементов.
    // Он срабатывает, когда меняется либо намерение пользователя (`intendedSize`), либо общее количество элементов (`totalCount`).
    useEffect(() => {
        // Если общее количество равно 0, ничего не показываем.
        if (totalCount === 0) {
            setVisibleCount(0);
        } else {
            // В остальных случаях показываем меньшее из двух:
            // либо сколько хочет пользователь, либо сколько есть всего.
            setVisibleCount(Math.min(intendedSize, totalCount));
        }
    }, [intendedSize, totalCount]);

    return { visibleCount, setVisibleCount: setVisibility, increaseVisibleCount };
}