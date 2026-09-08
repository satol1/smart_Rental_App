// src/hooks/useHighlightLogic.ts
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
export function useHighlightLogic({ autoResetDelay = 3500, enableScrollToHighlight = true } = {}) {
    const [highlightState, setHighlightState] = useState({ id: null, type: null });
    const location = useLocation();
    const navigate = useNavigate();
    const elementRef = useRef(null);
    // Обработка location.state для определения типа подсветки
    useEffect(() => {
        const state = location.state;
        // Поддержка разных форматов параметров для совместимости
        const highlightId = state?.highlightReservationId || state?.highlightId || state?.highlightRentalId;
        const from = state?.from;
        if (highlightId) {
            // Определяем тип подсветки по 'from' или другим признакам
            // 'transition' - для переходов, 'new' - для новых объектов
            const type = (from === 'rental' || from === 'calendar' || state?.statusFilterOverride) ? 'transition' : 'new';
            setHighlightState({ id: highlightId, type });
        }
    }, [location.state]);
    // ✅ ЦЕНТРАЛИЗАЦИЯ: Логика авто-сброса и скроллинга
    useEffect(() => {
        // Прокрутка к элементу, как только он появится в DOM
        if (enableScrollToHighlight && highlightState.id && elementRef.current) {
            elementRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
        // Таймер сброса для временной подсветки
        if (highlightState.type === 'transition' && highlightState.id) {
            const timer = setTimeout(() => {
                setHighlightState({ id: null, type: null });
                navigate(location.pathname, { replace: true, state: {} });
            }, autoResetDelay);
            return () => clearTimeout(timer);
        }
    }, [highlightState, autoResetDelay, enableScrollToHighlight, navigate, location.pathname]);
    // Функции для проверки подсветки
    const isHighlighted = (id) => highlightState.id === id;
    const isNewReservation = (id) => isHighlighted(id) && highlightState.type === 'new';
    const isTransitionHighlight = (id) => isHighlighted(id) && highlightState.type === 'transition';
    // Функция для получения CSS классов подсветки
    const getHighlightClasses = (id) => {
        if (!isHighlighted(id))
            return '';
        if (isNewReservation(id)) {
            return "ring-2 ring-sky-500 bg-sky-50 shadow-lg rounded-2xl";
        }
        else if (isTransitionHighlight(id)) {
            return "ring-2 ring-orange-500 bg-orange-50 shadow-lg rounded-2xl";
        }
        return '';
    };
    return {
        isHighlighted,
        isNewReservation,
        isTransitionHighlight,
        getHighlightClasses,
        highlightState,
        elementRef // Возвращаем ref для привязки к элементу
    };
}
