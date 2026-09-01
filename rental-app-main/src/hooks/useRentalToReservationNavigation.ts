// src/hooks/useRentalToReservationNavigation.ts
import { useNavigate } from 'react-router-dom';

export type NavigationContext = 'user' | 'admin';

interface UseRentalToReservationNavigationProps {
    context: NavigationContext;
}

export function useRentalToReservationNavigation({ context }: UseRentalToReservationNavigationProps) {
    const navigate = useNavigate();

    const navigateToReservation = (reservationId: number) => {
        if (context === 'user') {
            // Пользовательская навигация
            navigate("/reservations/my", { 
                state: { 
                    highlightReservationId: reservationId,
                    from: "rental"
                } 
            });
        } else {
            // Админская навигация
            navigate('/admin/reservations', {
                state: {
                    highlightId: reservationId,
                    from: 'rental', // Указываем контекст перехода
                    statusFilterOverride: 'all'
                }
            });
        }
    };

    return {
        navigateToReservation
    };
}
