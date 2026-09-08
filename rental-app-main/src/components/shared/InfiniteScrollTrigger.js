import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/components/shared/InfiniteScrollTrigger.tsx
import { useEffect } from "react";
import { useInView } from "react-intersection-observer"; // ✅ 1. Импортируем хук из новой библиотеки
import { Loader2 } from "lucide-react";
/**
 * Универсальный компонент для бесконечной загрузки.
 * Использует хук `useInView` из `react-intersection-observer` для надежного
 * отслеживания элемента и вызова fetchNextPage.
 */
export function InfiniteScrollTrigger({ hasNextPage, isFetchingNextPage, fetchNextPage, }) {
    // ✅ 2. Используем хук useInView. Он возвращает ref и boolean-флаг `inView`.
    const { ref, inView } = useInView({
        threshold: 0.1, // Сработает, когда 10% элемента видимо
        rootMargin: '100px', // Начнет загрузку за 100px до появления элемента
    });
    // ✅ 3. Используем useEffect для реакции на изменение `inView`.
    // Это более декларативный и безопасный подход.
    useEffect(() => {
        // Если элемент вошел в зону видимости, есть следующая страница и мы не в процессе загрузки,
        // то вызываем функцию загрузки.
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
    // ✅ 4. Вся сложная логика с new IntersectionObserver() и useRef удалена.
    return (
    // Просто передаем ref в наш div-триггер.
    _jsx("div", { ref: ref, className: "h-20 col-span-full flex justify-center items-center", children: isFetchingNextPage && (_jsxs("div", { className: "flex items-center gap-2 text-gray-500", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), _jsx("span", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })] })) }));
}
