// src/contexts/ReservationEditContext.tsx
import { createContext, useContext } from 'react';
export const ReservationEditContext = createContext(null);
export const useReservationEditContext = () => {
    const context = useContext(ReservationEditContext);
    if (!context) {
        throw new Error('useReservationEditContext must be used within a ReservationEditProvider');
    }
    return context;
};
