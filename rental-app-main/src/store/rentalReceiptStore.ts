// src/store/rentalReceiptStore.ts

import { create } from 'zustand';
import type { AdminRentalOut } from '@/types/rental';

interface RentalReceiptState {
    isOpen: boolean;
    rentalData: AdminRentalOut | null;
    isLoading: boolean;
    openReceipt: (data: AdminRentalOut) => void;
    closeReceipt: () => void;
    setLoading: (loading: boolean) => void;
}

export const useRentalReceiptStore = create<RentalReceiptState>((set) => ({
    isOpen: false,
    rentalData: null,
    isLoading: false,
    openReceipt: (data: AdminRentalOut) => set({ 
        isOpen: true, 
        rentalData: data,
        isLoading: false
    }),
    closeReceipt: () => set({ 
        isOpen: false, 
        rentalData: null,
        isLoading: false
    }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
