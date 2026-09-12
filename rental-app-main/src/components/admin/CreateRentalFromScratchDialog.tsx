// src/components/admin/CreateRentalFromScratchDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateRentalFromScratchDialog } from "@/hooks/admin/useCreateRentalFromScratchDialog";
import { CreateReservationStep1Details } from "./CreateReservationStep1Details";
import CompactFinancialBlock from "./CompactFinancialBlock";
import EquipmentListForFinalization from "./EquipmentListForFinalization";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CreateRentalFromScratchDialog({ open, onClose }: Props) {
    const {
        step,
        form,
        isSubmitting,
        users,
        isLoadingUsers,
        userSearch,
        setUserSearch,
        usersHasNextPage,
        usersFetchNextPage,
        usersIsFetchingNextPage,
        equipmentSearch,
        setEquipmentSearch,
        isLoadingEquipment,
        filteredAndGroupedEquipment,
        equipmentWithAccessories,
        availabilityMap,
        isLoadingAvailability,
        hasConflictsInSelection,
        handleNextStep,
        handleBackStep,
        handleFinalSubmit,
        handleCloseDialog,
        financialData,
        newlyAddedIds,
        // Промокод пропсы
        promoCode,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        promoCodeMessage,
        promoCodeValid,
    } = useCreateRentalFromScratchDialog({ isOpen: open, onClose });

    const renderStepContent = () => {
        switch (step) {
            case 'details':
                return (
                    <CreateReservationStep1Details
                        form={form}
                        users={users}
                        isLoadingUsers={isLoadingUsers}
                        userSearch={userSearch}
                        setUserSearch={setUserSearch}
                        usersHasNextPage={usersHasNextPage}
                        usersFetchNextPage={usersFetchNextPage}
                        usersIsFetchingNextPage={usersIsFetchingNextPage}
                        equipmentSearch={equipmentSearch}
                        setEquipmentSearch={setEquipmentSearch}
                        isLoadingEquipment={isLoadingEquipment}
                        filteredAndGroupedEquipment={filteredAndGroupedEquipment}
                        availabilityMap={availabilityMap}
                    />
                );
            
            case 'finalization':
                return (
                    <div className="space-y-4">
                        <CompactFinancialBlock
                            form={form}
                            finalCost={financialData.finalTotal}
                            discountAmount={financialData.discountAmount}
                            discountPercentage={financialData.totalDiscountPercentage}
                            promoCode={promoCode}
                            setPromoCode={setPromoCode}
                            applyPromoCode={applyPromoCode}
                            removePromoCode={removePromoCode}
                            promoCodeMessage={promoCodeMessage}
                            promoCodeValid={promoCodeValid}
                        />
                        
                        {/* Список выбранного оборудования с подсветкой новых позиций */}
                        <EquipmentListForFinalization
                            equipmentWithAccessories={equipmentWithAccessories}
                            newlyAddedIds={newlyAddedIds}
                            availabilityMap={availabilityMap}
                            selectedAccessories={form.watch("selected_accessories") || {}}
                            onToggleAccessory={(equipmentId, accessoryId) => {
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
                                } else {
                                    // Добавляем аксессуар
                                    const updatedAccessories = {
                                        ...currentAccessories,
                                        [equipmentId]: [...equipmentAccessories, accessoryId]
                                    };
                                    form.setValue("selected_accessories", updatedAccessories);
                                }
                            }}
                            disabled={isSubmitting}
                        />
                        
                        {/* Дополнительная информация */}
                        <div className="p-3 bg-muted border rounded-lg">
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div>Период: {form.watch("start_date")} - {form.watch("end_date")}</div>
                                {financialData.appliedPromoCode && (
                                    <div>Промокод: {financialData.appliedPromoCode}</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    const renderFooterButtons = () => {
        switch (step) {
            case 'details':
                return (
                    <>
                        <Button variant="ghost" onClick={handleCloseDialog}>
                            Отмена
                        </Button>
                        <Button 
                            onClick={handleNextStep}
                            disabled={isLoadingUsers || isLoadingEquipment || isLoadingAvailability || hasConflictsInSelection}
                        >
                            Далее
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </>
                );
            
            case 'finalization':
                return (
                    <>
                        <Button variant="ghost" onClick={handleBackStep}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Назад
                        </Button>
                        <Button 
                            onClick={handleFinalSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Создание..." : "Создать аренду"}
                        </Button>
                    </>
                );
            
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col resize overflow-auto">
                <DialogHeader>
                    <DialogTitle>
                        Создание аренды с нуля
                        {step === 'finalization' && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                (Шаг 2 из 2)
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'details' 
                            ? "Выберите пользователя, даты и оборудование для создания новой аренды"
                            : "Подтвердите финансовые детали и создайте аренду"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {renderStepContent()}
                </div>

                <DialogFooter className="flex-shrink-0">
                    {renderFooterButtons()}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
