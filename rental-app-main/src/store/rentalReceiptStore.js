// src/store/rentalReceiptStore.ts
import { create } from 'zustand';
export const useRentalReceiptStore = create((set) => ({
    isOpen: false,
    rentalData: null,
    isLoading: false,
    openReceipt: (data) => set({
        isOpen: true,
        rentalData: data,
        isLoading: false
    }),
    closeReceipt: () => set({
        isOpen: false,
        rentalData: null,
        isLoading: false
    }),
    setLoading: (loading) => set({ isLoading: loading }),
}));
