// src/components/admin/ReturnRentalDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyText } from "@/components/ui/money-text";
import { PackageCheck, CheckCircle2, AlertCircle } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";
import { useRentalReturnForm } from "@/hooks/admin/useRentalReturnForm";
import ReturnFinancials from "./ReturnFinancials";
import ReturnAccessoriesChecklist from "./ReturnAccessoriesChecklist";
import ReturnDepositBlock from "./ReturnDepositBlock";

interface Props {
    rental: AdminRentalOut | null;
    open: boolean;
    onClose: () => void;
}

export default function ReturnRentalDialog({ rental, open, onClose }: Props) {
    const {
        // Состояния
        selectedEquipmentIds,
        rentedEquipmentList,
        alreadyReturnedEquipmentList,
        isPartialReturn,
        hasEquipmentSelected,
        paymentAmount,
        setPaymentAmount,
        paymentDescription,
        setPaymentDescription,
        paymentApplied,
        checkedAccessories,
        lostAccessories,
        lostAccessoriesTotal,
        dynamicRemainingAmount,
        depositAction,
        setDepositAction,
        depositRetainedAmount,
        setDepositRetainedAmount,
        depositNotes,
        setDepositNotes,
        isDepositValid,
        
        // Функции-обработчики
        handleToggleEquipment,
        handleSelectAllEquipment,
        handleDeselectAllEquipment,
        handleApplyPayment,
        handleCancelPayment,
        handleToggleAccessory,
        handleToggleLostAccessory,
        handleSelectAllAccessories,
        handleDeselectAllAccessories,
        handleAutoDeductLostFromDeposit,
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
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-primary" />
                        Оформление возврата аренды #{rental.id}
                    </DialogTitle>
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

                    {/* Выбор возвращаемого оборудования */}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold text-sm">Возвращаемое оборудование:</Label>
                            {rentedEquipmentList.length > 1 && (
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllEquipment}
                                        className="text-primary hover:underline"
                                    >
                                        Выбрать все
                                    </button>
                                    <span className="text-muted-foreground">|</span>
                                    <button
                                        type="button"
                                        onClick={handleDeselectAllEquipment}
                                        className="text-muted-foreground hover:underline"
                                    >
                                        Снять все
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Список активного оборудования */}
                        <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3 bg-muted/60">
                            {rentedEquipmentList.map((eq) => {
                                const isChecked = selectedEquipmentIds.has(eq.id);
                                return (
                                    <div
                                        key={eq.id}
                                        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                                            isChecked ? "bg-background border border-primary/30" : "opacity-75"
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`eq-return-${eq.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => handleToggleEquipment(eq.id)}
                                            />
                                            <Label
                                                htmlFor={`eq-return-${eq.id}`}
                                                className="text-sm font-medium cursor-pointer"
                                            >
                                                {eq.name}
                                            </Label>
                                        </div>
                                        {eq.daily_rate && (
                                            <span className="text-xs text-muted-foreground">
                                                <MoneyText value={eq.daily_rate} />/сут
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Список ранее возвращенного оборудования (если есть) */}
                        {alreadyReturnedEquipmentList.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded p-2 border border-dashed">
                                <span className="font-medium flex items-center gap-1 mb-1 text-success">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ранее возвращенные позиции:
                                </span>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    {alreadyReturnedEquipmentList.map((eq) => (
                                        <li key={eq.id}>
                                            {eq.name} {eq.actual_return_date ? `(возвращено ${eq.actual_return_date})` : ""}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Предупреждение о частичном возврате */}
                        {isPartialReturn && (
                            <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning-soft border border-warning/30 text-warning text-xs">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <strong>Частичный возврат:</strong> будет возвращено {selectedEquipmentIds.size} из {rentedEquipmentList.length} позиций. Аренда останется активной с оставшимся оборудованием.
                                </div>
                            </div>
                        )}

                        {!hasEquipmentSelected && (
                            <p className="text-xs text-destructive">
                                Выберите хотя бы одну позицию для оформления возврата.
                            </p>
                        )}
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
                        lostAccessoriesTotal={lostAccessoriesTotal}
                    />

                    {/* Блок управления залогом */}
                    <ReturnDepositBlock
                        rental={rental}
                        depositAction={depositAction}
                        setDepositAction={setDepositAction}
                        depositRetainedAmount={depositRetainedAmount}
                        setDepositRetainedAmount={setDepositRetainedAmount}
                        depositNotes={depositNotes}
                        setDepositNotes={setDepositNotes}
                        lostAccessoriesTotal={lostAccessoriesTotal}
                        handleAutoDeductLostFromDeposit={handleAutoDeductLostFromDeposit}
                    />

                    {/* Список аксессуаров */}
                    <ReturnAccessoriesChecklist
                        rental={rental}
                        accessoriesByEquipment={accessoriesByEquipment}
                        checkedAccessories={checkedAccessories}
                        lostAccessories={lostAccessories}
                        handleToggleAccessory={handleToggleAccessory}
                        handleToggleLostAccessory={handleToggleLostAccessory}
                        handleSelectAllAccessories={handleSelectAllAccessories}
                        handleDeselectAllAccessories={handleDeselectAllAccessories}
                        totalAccessoriesCount={totalAccessoriesCount}
                        lostAccessoriesTotal={lostAccessoriesTotal}
                    />

                    {/* Предупреждающий индикатор долга при завершении аренды */}
                    {dynamicRemainingAmount > 0 && (
                        <div
                            data-testid="debt-warning-indicator"
                            className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                        >
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <div className="font-semibold text-foreground">
                                    Внимание: возврат будет оформлен с задолженностью!
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Непогашенная сумма: <strong className="text-destructive font-semibold"><MoneyText value={dynamicRemainingAmount} /></strong>.
                                    {isPartialReturn
                                        ? " Задолженность останется на балансе клиента."
                                        : " Заказ получит статус «Завершена с долгом» (completed_with_debt). Сумма будет зафиксирована на балансе клиента."}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button
                            type="submit"
                            disabled={!isValid || isSubmittingReturn || !hasEquipmentSelected || (totalAccessoriesCount > 0 && !allAccessoriesChecked) || !isDepositValid}
                            variant={isPartialReturn ? "secondary" : "default"}
                        >
                            {isSubmittingReturn
                                ? "Обработка..."
                                : isPartialReturn
                                    ? `Оформить частичный возврат (${selectedEquipmentIds.size})`
                                    : "Подтвердить возврат"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}