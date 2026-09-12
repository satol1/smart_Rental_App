// src/hooks/useHighlightLogic.ts
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type HighlightType = 'new' | 'transition';

interface HighlightState {
    id: number | null;
    type: HighlightType | null;
}

/** Поля location.state, используемые для подсветки резерва/аренды */
interface HighlightLocationState {
    highlightReservationId?: number;
    highlightId?: number;
    highlightRentalId?: number;
    from?: string;
    statusFilterOverride?: string;
}

interface UseHighlightLogicProps {
    autoResetDelay?: number; // в миллисекундах, по умолчанию 3500
    enableScrollToHighlight?: boolean; // включить автоматическую прокрутку к подсвеченному элементу
}

export function useHighlightLogic({ 
    autoResetDelay = 3500, 
    enableScrollToHighlight = true 
}: UseHighlightLogicProps = {}) {
    const [highlightState, setHighlightState] = useState<HighlightState>({ id: null, type: null });
    const location = useLocation();
    const navigate = useNavigate();
    const elementRef = useRef<HTMLDivElement>(null);

    // Обработка location.state для определения типа подсветки
    useEffect(() => {
        const state = location.state as HighlightLocationState | null;
        
        // Поддержка разных форматов параметров для совместимости
        const highlightId = state?.highlightReservationId || state?.highlightId || state?.highlightRentalId;
        const from = state?.from;
        
        if (highlightId) {
            // Определяем тип подсветки по 'from' или другим признакам
            // 'transition' - для переходов, 'new' - для новых объектов
            const type: HighlightType = (from === 'rental' || from === 'calendar' || state?.statusFilterOverride) ? 'transition' : 'new';
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
    const isHighlighted = (id: number) => highlightState.id === id;
    const isNewReservation = (id: number) => isHighlighted(id) && highlightState.type === 'new';
    const isTransitionHighlight = (id: number) => isHighlighted(id) && highlightState.type === 'transition';

    // Функция для получения CSS классов подсветки
    const getHighlightClasses = (id: number) => {
        if (!isHighlighted(id)) return '';
        
        if (isNewReservation(id)) {
            return "ring-2 ring-primary bg-info-soft shadow-lg rounded-2xl";
        } else if (isTransitionHighlight(id)) {
            return "ring-2 ring-warning bg-warning-soft shadow-lg rounded-2xl";
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
