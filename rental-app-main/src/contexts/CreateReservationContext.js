// src/contexts/CreateReservationContext.tsx
import { createContext, useContext } from 'react';
export const CreateReservationContext = createContext(null);
export const useCreateReservationContext = () => {
    const context = useContext(CreateReservationContext);
    if (!context) {
        throw new Error('useCreateReservationContext must be used within a CreateReservationProvider');
    }
    return context;
};
