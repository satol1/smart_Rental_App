// src/components/admin/ReturnRentalDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRentalOut } from "@/types/rental";
import { useRentalReturnForm } from "@/hooks/admin/useRentalReturnForm";
import ReturnFinancials from "./ReturnFinancials";
import ReturnAccessoriesChecklist from "./ReturnAccessoriesChecklist";

interface Props {
    rental: AdminRentalOut | null;
    open: boolean;
    onClose: () => void;
}

export default function ReturnRentalDialog({ rental, open, onClose }: Props) {
    const {
        // Состояния
        paymentAmount,
        setPaymentAmount,
        paymentDescription,
        setPaymentDescription,
        paymentApplied,
        checkedAccessories,
        dynamicRemainingAmount,
        
        // Функции-обработчики
        handleApplyPayment,
        handleCancelPayment,
        handleToggleAccessory,
        handleAutoFillPayment,
        onSubmit,
        
        // Состояния мутаций
        isSubmittingReturn,
        isApplyingPayment,
        
        // Данные формы от react-hook-form
        register,
        handleSubmit,
        formState: { errors, isValid },
        
        // Другие вычисляемые значения
        accessoriesByEquipment,
        allAccessoriesChecked,
        totalAccessoriesCount,
    } = useRentalReturnForm({ rental, onClose });

    if (!rental) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Оформление возврата аренды #{rental.id}</DialogTitle>
                    <DialogDescription>
                        Подтвердите возврат от клиента: <strong>{rental.user.full_name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="actual_return_date">Фактическая дата возврата *</Label>
                        <Input
                            id="actual_return_date"
                            type="date"
                            {...register("actual_return_date")}
                        />
                        {errors.actual_return_date && <p className="text-xs text-destructive mt-1">{errors.actual_return_date.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="notes_on_return">Заметки при возврате</Label>
                        <Textarea
                            id="notes_on_return"
                            {...register("notes_on_return")}
                            placeholder="Например: оборудование чистое, комплектация полная..."
                        />
                    </div>

                    {/* Финансовый блок */}
                    <ReturnFinancials
                        rental={rental}
                        dynamicRemainingAmount={dynamicRemainingAmount}
                        paymentAmount={paymentAmount}
                        setPaymentAmount={setPaymentAmount}
                        paymentDescription={paymentDescription}
                        setPaymentDescription={setPaymentDescription}
                        paymentApplied={paymentApplied}
                        handleApplyPayment={handleApplyPayment}
                        handleCancelPayment={handleCancelPayment}
                        isApplyingPayment={isApplyingPayment}
                        handleAutoFillPayment={handleAutoFillPayment}
                        overdueSurcharge={rental.overdue_surcharge || undefined}
                    />

                    {/* Список аксессуаров */}
                    <ReturnAccessoriesChecklist
                        rental={rental}
                        accessoriesByEquipment={accessoriesByEquipment}
                        checkedAccessories={checkedAccessories}
                        handleToggleAccessory={handleToggleAccessory}
                        totalAccessoriesCount={totalAccessoriesCount}
                    />

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button
                            type="submit"
                            disabled={!isValid || isSubmittingReturn || (totalAccessoriesCount > 0 && !allAccessoriesChecked)}
                        >
                            {isSubmittingReturn ? "Обработка..." : "Подтвердить возврат"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}