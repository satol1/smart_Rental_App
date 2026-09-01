// path: rental-app-main/src/hooks/useCalendarNavigation.ts

import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from './useProfile';

export type NavigationContext = 'user' | 'admin';

interface UseCalendarNavigationProps {
    context: NavigationContext;
}

/**
 * Хук для централизованной навигации со страницы календаря.
 * @param {NavigationContext} context - Определяет, откуда происходит навигация ('user' или 'admin').
 */
export function useCalendarNavigation({ context }: UseCalendarNavigationProps) {
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();

    const navigateToOrder = (orderType: 'reservation' | 'rental', orderId: number, userId: number) => {
        if (!currentUser) {
            console.warn('Пользователь не авторизован');
            return;
        }

        const isCurrentUserEvent = currentUser.id === userId;

        if (isCurrentUserEvent) {
            // Пользователь всегда переходит на свою страницу заказов
            const targetPath = orderType === 'rental' ? '/reservations/my' : '/reservations/my';
            const highlightKey = orderType === 'rental' ? 'highlightRentalId' : 'highlightReservationId';
            
            navigate(targetPath, { 
                state: { 
                    [highlightKey]: orderId,
                    from: "calendar"
                } 
            });
        } else if (context === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
            // Админ/менеджер переходит на соответствующие админские страницы
            const targetPath = orderType === 'reservation' ? '/admin/reservations' : '/admin/rentals';
            navigate(targetPath, {
                state: {
                    highlightId: orderId,
                    statusFilterOverride: 'all' // Показать все статусы для поиска
                }
            });
        }
        // Если context 'user' и событие не принадлежит пользователю, навигации не происходит.
    };

    return {
        navigateToOrder,
    };
}