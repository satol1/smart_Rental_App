import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/CreateRentalFromScratchDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateRentalFromScratchDialog } from "@/hooks/admin/useCreateRentalFromScratchDialog";
import { CreateReservationStep1Details } from "./CreateReservationStep1Details";
import CompactFinancialBlock from "./CompactFinancialBlock";
import EquipmentListForFinalization from "./EquipmentListForFinalization";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function CreateRentalFromScratchDialog({ open, onClose }) {
    const { step, form, isSubmitting, users, isLoadingUsers, equipmentSearch, setEquipmentSearch, isLoadingEquipment, filteredAndGroupedEquipment, equipmentWithAccessories, availabilityMap, isLoadingAvailability, hasConflictsInSelection, handleNextStep, handleBackStep, handleFinalSubmit, handleCloseDialog, financialData, newlyAddedIds, 
    // Промокод пропсы
    promoCode, setPromoCode, applyPromoCode, removePromoCode, promoCodeMessage, } = useCreateRentalFromScratchDialog({ isOpen: open, onClose });
    const renderStepContent = () => {
        switch (step) {
            case 'details':
                return (_jsx(CreateReservationStep1Details, { form: form, users: users, isLoadingUsers: isLoadingUsers, equipmentSearch: equipmentSearch, setEquipmentSearch: setEquipmentSearch, isLoadingEquipment: isLoadingEquipment, filteredAndGroupedEquipment: filteredAndGroupedEquipment, availabilityMap: availabilityMap }));
            case 'finalization':
                return (_jsxs("div", { className: "space-y-4", children: [_jsx(CompactFinancialBlock, { form: form, finalCost: financialData.finalTotal, discountAmount: financialData.discountAmount, discountPercentage: financialData.totalDiscountPercentage, promoCode: promoCode, setPromoCode: setPromoCode, applyPromoCode: applyPromoCode, removePromoCode: removePromoCode, promoCodeMessage: promoCodeMessage }), _jsx(EquipmentListForFinalization, { equipmentWithAccessories: equipmentWithAccessories, newlyAddedIds: newlyAddedIds, availabilityMap: availabilityMap, selectedAccessories: form.watch("selected_accessories") || {}, onToggleAccessory: (equipmentId, accessoryId) => {
                                const currentAccessories = form.getValues("selected_accessories") || {};
                                const equipmentAccessories = currentAccessories[equipmentId] || [];
                                const isSelected = equipmentAccessories.includes(accessoryId);
                                if (isSelected) {
                                    // Убираем аксессуар
                                    const updatedAccessories = {
                                        ...currentAccessories,
                                        [equipmentId]: equipmentAccessories.filter(id => id !== accessoryId)
                                    };
                                    form.setValue("selected_accessories", updatedAccessories);
                                }
                                else {
                                    // Добавляем аксессуар
                                    const updatedAccessories = {
                                        ...currentAccessories,
                                        [equipmentId]: [...equipmentAccessories, accessoryId]
                                    };
                                    form.setValue("selected_accessories", updatedAccessories);
                                }
                            }, disabled: isSubmitting }), _jsx("div", { className: "p-3 bg-slate-50 border rounded-lg", children: _jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [_jsxs("div", { children: ["\u041F\u0435\u0440\u0438\u043E\u0434: ", form.watch("start_date"), " - ", form.watch("end_date")] }), financialData.appliedPromoCode && (_jsxs("div", { children: ["\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434: ", financialData.appliedPromoCode] }))] }) })] }));
            default:
                return null;
        }
    };
    const renderFooterButtons = () => {
        switch (step) {
            case 'details':
                return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: handleCloseDialog, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsxs(Button, { onClick: handleNextStep, disabled: isLoadingUsers || isLoadingEquipment || isLoadingAvailability || hasConflictsInSelection, children: ["\u0414\u0430\u043B\u0435\u0435", _jsx(ChevronRight, { className: "ml-2 h-4 w-4" })] })] }));
            case 'finalization':
                return (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", onClick: handleBackStep, children: [_jsx(ChevronLeft, { className: "mr-2 h-4 w-4" }), "\u041D\u0430\u0437\u0430\u0434"] }), _jsx(Button, { onClick: handleFinalSubmit, disabled: isSubmitting, children: isSubmitting ? "Создание..." : "Создать аренду" })] }));
            default:
                return null;
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleCloseDialog, children: _jsxs(DialogContent, { className: "sm:max-w-2xl max-h-[95vh] flex flex-col resize overflow-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0430\u0440\u0435\u043D\u0434\u044B \u0441 \u043D\u0443\u043B\u044F", step === 'finalization' && (_jsx("span", { className: "text-sm font-normal text-gray-500 ml-2", children: "(\u0428\u0430\u0433 2 \u0438\u0437 2)" }))] }), _jsx(DialogDescription, { children: step === 'details'
                                ? "Выберите пользователя, даты и оборудование для создания новой аренды"
                                : "Подтвердите финансовые детали и создайте аренду" })] }), _jsx("div", { className: "flex-1 overflow-y-auto py-4", children: renderStepContent() }), _jsx(DialogFooter, { className: "flex-shrink-0", children: renderFooterButtons() })] }) }));
}
