// components/admin/EditableRentalCard.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Loader2, Calendar, DollarSign, FileText } from "lucide-react";
import { MoneyText } from "@/components/ui/money-text";
import { useAdminRentalEdit } from "@/hooks/admin/useAdminRentalEdit";

import ActiveRentalFinancialBlock from "@/components/admin/ActiveRentalFinancialBlock";
import type { AdminRentalOut } from "@/types/rental";

interface Props {
    rental: AdminRentalOut;
    onCancel: () => void;
}

export default function EditableRentalCard({ rental, onCancel }: Props) {
    const { 
        register, 
        handleSubmit, 
        errors, 
        isValid, 
        isDirty, 
        isSaving,
        holidayError,
        priceDetails,
        isCalculatingPrice,
        promoCode,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        promoCodeMessage,
        promoCodeValid,
        isApplyingPromoCode
    } = useAdminRentalEdit({
        rental,
        onSuccess: onCancel, // Закрываем форму при успехе
    });


    const isActiveRental = ['active', 'overdue'].includes(rental.status);
    const isCompletedRental = rental.status === 'completed';
    

    return (
        <Card className="w-full transition-shadow border-2 border-dashed border-primary/40 bg-info-soft/50">
            <form onSubmit={handleSubmit}>
                <CardContent className="p-4 space-y-6">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg text-primary">Редактирование аренды #{rental.id}</h3>
                    </div>
                    

                    {isActiveRental && (
                        <>
                            {/* Форма для активной аренды */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Calendar className="w-4 h-4" />
                                    Изменение условий аренды
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">Дата возврата (план)</Label>
                                        <Input 
                                            id="end_date" 
                                            type="date"
                                            {...register("end_date")} 
                                        />
                                        {errors.end_date && <p className="text-xs text-destructive mt-1">{errors.end_date.message}</p>}
                                        {holidayError && <p className="text-xs text-destructive mt-1">{holidayError}</p>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="prepayment_amount">Общая предоплата (₽)</Label>
                                        <Input 
                                            id="prepayment_amount" 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            {...register("prepayment_amount")} 
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Текущая предоплата: <MoneyText value={rental.prepayment_amount} />
                                        </p>
                                        {errors.prepayment_amount && <p className="text-xs text-destructive mt-1">{errors.prepayment_amount.message}</p>}
                                    </div>
                                </div>

                                {/* Финансовая сводка с пересчетом для активной аренды */}
                                <ActiveRentalFinancialBlock
                                    priceDetails={priceDetails}
                                    rental={rental}
                                    promoCode={promoCode}
                                    setPromoCode={setPromoCode}
                                    applyPromoCode={applyPromoCode}
                                    removePromoCode={removePromoCode}
                                    promoCodeMessage={promoCodeMessage}
                                    promoCodeValid={promoCodeValid}
                                    isLoading={isCalculatingPrice}
                                    isApplyingPromoCode={isApplyingPromoCode}
                                />
                            </div>
                        </>
                    )}

                    {isCompletedRental && (
                        <>
                            {/* Форма для завершенной аренды */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <DollarSign className="w-4 h-4" />
                                    Корректировка завершенной аренды
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="final_cost">Итоговая стоимость (₽)</Label>
                                        <Input 
                                            id="final_cost" 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            {...register("final_cost")} 
                                            placeholder="Оставьте пустым для авторасчета"
                                        />
                                        {errors.final_cost && <p className="text-xs text-destructive mt-1">{errors.final_cost.message}</p>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="deposit_amount">Залог (₽)</Label>
                                        <Input 
                                            id="deposit_amount" 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            {...register("deposit_amount")} 
                                        />
                                        {errors.deposit_amount && <p className="text-xs text-destructive mt-1">{errors.deposit_amount.message}</p>}
                                    </div>
                                </div>

                                {/* Неизменяемые поля для завершенной аренды */}
                                <div className="p-3 bg-muted rounded-lg space-y-2">
                                    <div className="text-sm font-medium text-muted-foreground">Неизменяемые поля:</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div>Начало: {rental.start_date}</div>
                                        <div>Окончание: {rental.end_date}</div>
                                        <div>Возврат: {rental.actual_return_date || 'Не указан'}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Общие поля */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <FileText className="w-4 h-4" />
                            Общие поля
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {!isCompletedRental && (
                                <div className="space-y-2">
                                    <Label htmlFor="deposit_amount">Залог (₽)</Label>
                                    <Input 
                                        id="deposit_amount" 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        {...register("deposit_amount")} 
                                    />
                                    {errors.deposit_amount && <p className="text-xs text-destructive mt-1">{errors.deposit_amount.message}</p>}
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <Label htmlFor="notes_on_issue">Заметки при выдаче</Label>
                                <Textarea 
                                    id="notes_on_issue" 
                                    {...register("notes_on_issue")} 
                                    rows={2}
                                    placeholder="Дополнительные заметки..."
                                />
                                {errors.notes_on_issue && <p className="text-xs text-destructive mt-1">{errors.notes_on_issue.message}</p>}
                            </div>
                        </div>

                        {isCompletedRental && (
                            <div className="space-y-2">
                                <Label htmlFor="notes_on_return">Заметки при возврате</Label>
                                <Textarea 
                                    id="notes_on_return" 
                                    {...register("notes_on_return")} 
                                    rows={2}
                                    placeholder="Заметки о состоянии при возврате..."
                                />
                                {errors.notes_on_return && <p className="text-xs text-destructive mt-1">{errors.notes_on_return.message}</p>}
                            </div>
                        )}
                    </div>

                    {/* Кнопки управления */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
                            <X className="mr-2 h-4 w-4" /> Отмена
                        </Button>
                        <Button type="submit" disabled={!isValid || !isDirty || isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Сохранить изменения
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}