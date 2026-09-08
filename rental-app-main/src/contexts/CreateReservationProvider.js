import { jsx as _jsx } from "react/jsx-runtime";
import { useCreateReservationDialog } from "@/hooks/admin/create-reservation/useCreateReservationDialog";
import { CreateReservationContext } from "./CreateReservationContext";
export const CreateReservationProvider = ({ children, isOpen, onClose }) => {
    // Используем существующий хук для получения всей логики
    const dialogData = useCreateReservationDialog({ isOpen, onClose });
    // Создаем значение контекста
    const contextValue = {
        step: dialogData.step,
        setStep: dialogData.setStep,
        form: dialogData.form,
        users: dialogData.users,
        isLoadingUsers: dialogData.isLoadingUsers,
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
    return (_jsx(CreateReservationContext.Provider, { value: contextValue, children: children }));
};
