// src/contexts/CreateReservationContext.tsx

import { createContext, useContext } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { UserOut } from '@/types/user';
import type { Equipment } from '@/types/equipment';
import type { AvailabilityInfo } from '@/types/availability';
import type { CreateReservationFormData } from '@/hooks/admin/create-reservation/useCreateReservationForm';

export interface CreateReservationContextValue {
    // Состояние UI
    step: 'details' | 'accessories';
    setStep: (step: 'details' | 'accessories') => void;
    
    // Форма
    form: UseFormReturn<CreateReservationFormData>;
    
    // Данные
    users: UserOut[];
    isLoadingUsers: boolean;
    allEquipment: Equipment[];
    isLoadingEquipment: boolean;
    filteredAndGroupedEquipment: { tree: Record<string, Record<string, Equipment[]>>, visibleIds: number[] };
    availabilityMap: Record<number, AvailabilityInfo>;
    equipmentWithAccessories: Equipment[];
    
    // Состояние загрузки
    isLoadingAvailability: boolean;
    isSubmitting: boolean;
    
    // Валидация
    hasConflictsInSelection: boolean;
    
    // Поиск оборудования
    equipmentSearch: string;
    setEquipmentSearch: (query: string) => void;
    
    // Финансовые данные
    financialData: {
        priceDetails: any;
        promoCode: string;
        setPromoCode: (code: string) => void;
        applyPromoCode: () => void;
        removePromoCode: () => void;
        promoCodeMessage: string;
        isCalculatingPrice: boolean;
        isApplyingPromoCode: boolean;
        appliedPromoCode: any;
    };
    
    // Действия
    handleNextStep: () => Promise<void>;
    onSubmit: () => void;
    handleCloseDialog: () => void;
}

export const CreateReservationContext = createContext<CreateReservationContextValue | null>(null);

export const useCreateReservationContext = () => {
    const context = useContext(CreateReservationContext);
    if (!context) {
        throw new Error('useCreateReservationContext must be used within a CreateReservationProvider');
    }
    return context;
};
