// src/hooks/useRentalToReservationNavigation.ts
import { useNavigate } from 'react-router-dom';
export function useRentalToReservationNavigation({ context }) {
    const navigate = useNavigate();
    const navigateToReservation = (reservationId) => {
        if (context === 'user') {
            // Пользовательская навигация
            navigate("/reservations/my", {
                state: {
                    highlightReservationId: reservationId,
                    from: "rental"
                }
            });
        }
        else {
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
