// src/components/admin/CreateReservationDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { CreateReservationProvider } from "@/contexts/CreateReservationProvider";
import { useCreateReservationContext } from "@/contexts/CreateReservationContext";
import { CreateReservationStep1Details } from "./CreateReservationStep1Details";
import { CreateReservationStep2Accessories } from "./CreateReservationStep2Accessories";
import FinancialSummaryBlock from "@/components/shared/FinancialSummaryBlock";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Внутренний компонент, который использует Context
const CreateReservationDialogContent = () => {
    const {
        step, setStep, form, users, isLoadingUsers,
        equipmentSearch, setEquipmentSearch,
        isLoadingEquipment, filteredAndGroupedEquipment, availabilityMap,
        equipmentWithAccessories, isLoadingAvailability, hasConflictsInSelection,
        isSubmitting, handleNextStep, onSubmit, handleCloseDialog,
        financialData
    } = useCreateReservationContext();

    const { formState: { isValid } } = form;

    const formId = "create-reservation-admin-form";

    return (
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Создать новый резерв (Шаг {step === 'details' ? 1 : 2} из 2)</DialogTitle>
                <DialogDescription>
                    {step === 'details'
                        ? "Выберите клиента, даты и оборудование для создания."
                        : "Выберите дополнительные аксессуары для позиций в резерве."
                    }
                </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6">
                <form id={formId} onSubmit={onSubmit} className="contents">
                    {step === 'details' ? (
                        <CreateReservationStep1Details
                            form={form}
                            users={users}
                            isLoadingUsers={isLoadingUsers}
                            equipmentSearch={equipmentSearch}
                            setEquipmentSearch={setEquipmentSearch}
                            isLoadingEquipment={isLoadingEquipment}
                            filteredAndGroupedEquipment={filteredAndGroupedEquipment}
                            availabilityMap={availabilityMap}
                        />
                    ) : (
                        <CreateReservationStep2Accessories />
                    )}
                </form>
            </div>

            <DialogFooter className="p-6 pt-4 border-t items-center">
                {step === 'details' ? (
                    <>
                        {/* Используем универсальный компонент для отображения сводки */}
                        <FinancialSummaryBlock
                            priceDetails={financialData.priceDetails}
                            accessoriesDailyTotal={0} // В админке аксессуары считаются сразу
                            promoCode={financialData.promoCode}
                            setPromoCode={financialData.setPromoCode}
                            applyPromoCode={financialData.applyPromoCode}
                            removePromoCode={financialData.removePromoCode}
                            promoCodeMessage={financialData.promoCodeMessage}
                            promoCodeValid={financialData.promoCodeValid}
                            isLoading={isLoadingAvailability || financialData.isCalculatingPrice}
                            isApplyingPromoCode={financialData.isApplyingPromoCode}
                            isSubmitting={isSubmitting}
                            isFormValid={isValid}
                            hasConflicts={hasConflictsInSelection}
                            variant="admin"
                            showActions={false}
                        />
                        <Button type="button" variant="ghost" onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="button" onClick={handleNextStep} disabled={!isValid || isSubmitting || hasConflictsInSelection || isLoadingAvailability}>
                            {equipmentWithAccessories.length > 0 ? "Далее" : "Создать резерв"}
                            {equipmentWithAccessories.length > 0 && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </>
                ) : (
                    <>
                        {/* Финансовая сводка на втором шаге */}
                        <FinancialSummaryBlock
                            priceDetails={financialData.priceDetails}
                            accessoriesDailyTotal={0} // В админке аксессуары считаются сразу
                            promoCode={financialData.promoCode}
                            setPromoCode={financialData.setPromoCode}
                            applyPromoCode={financialData.applyPromoCode}
                            removePromoCode={financialData.removePromoCode}
                            promoCodeMessage={financialData.promoCodeMessage}
                            promoCodeValid={financialData.promoCodeValid}
                            isLoading={isLoadingAvailability || financialData.isCalculatingPrice}
                            isApplyingPromoCode={financialData.isApplyingPromoCode}
                            isSubmitting={isSubmitting}
                            isFormValid={isValid}
                            hasConflicts={hasConflictsInSelection}
                            variant="admin"
                            showActions={false}
                        />
                        <Button type="button" variant="ghost" onClick={() => setStep('details')} className="mr-auto">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Назад
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="submit" form={formId} disabled={isSubmitting}>
                            {isSubmitting ? "Создание..." : "Создать резерв"}
                        </Button>
                    </>
                )}
            </DialogFooter>
        </DialogContent>
    );
};

// Основной компонент с Provider
export default function CreateReservationDialog({ isOpen, onClose }: Props) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <CreateReservationProvider isOpen={isOpen} onClose={onClose}>
                <CreateReservationDialogContent />
            </CreateReservationProvider>
        </Dialog>
    );
}