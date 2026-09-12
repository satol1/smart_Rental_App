// src/contexts/CreateReservationProvider.tsx

import React from "react";
import { useCreateReservationDialog } from "@/hooks/admin/create-reservation/useCreateReservationDialog";
import { CreateReservationContext, type CreateReservationContextValue } from "./CreateReservationContext";

interface CreateReservationProviderProps {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
}

export const CreateReservationProvider: React.FC<CreateReservationProviderProps> = ({
    children,
    isOpen,
    onClose
}) => {
    // Используем существующий хук для получения всей логики
    const dialogData = useCreateReservationDialog({ isOpen, onClose });

    // Создаем значение контекста
    const contextValue: CreateReservationContextValue = {
        step: dialogData.step,
        setStep: dialogData.setStep,
        form: dialogData.form,
        users: dialogData.users,
        isLoadingUsers: dialogData.isLoadingUsers,
        userSearch: dialogData.userSearch,
        setUserSearch: dialogData.setUserSearch,
        usersHasNextPage: dialogData.usersHasNextPage,
        usersFetchNextPage: dialogData.usersFetchNextPage,
        usersIsFetchingNextPage: dialogData.usersIsFetchingNextPage,
        allEquipment: dialogData.allEquipment,
        isLoadingEquipment: dialogData.isLoadingEquipment,
        filteredAndGroupedEquipment: dialogData.filteredAndGroupedEquipment,
        availabilityMap: dialogData.availabilityMap,
        equipmentWithAccessories: dialogData.equipmentWithAccessories,
        isLoadingAvailability: dialogData.isLoadingAvailability,
        isSubmitting: dialogData.isSubmitting,
        hasConflictsInSelection: dialogData.hasConflictsInSelection,
        equipmentSearch: dialogData.equipmentSearch,
        setEquipmentSearch: dialogData.setEquipmentSearch,
        financialData: dialogData.financialData,
        handleNextStep: dialogData.handleNextStep,
        onSubmit: dialogData.onSubmit,
        handleCloseDialog: dialogData.handleCloseDialog,
    };

    return (
        <CreateReservationContext.Provider value={contextValue}>
            {children}
        </CreateReservationContext.Provider>
    );
};
