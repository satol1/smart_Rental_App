// src/components/admin/CompactFinancialBlock.tsx

import type { UseFormReturn, FieldValues } from "react-hook-form";
import type { FinalizationFormFields } from "@/components/shared/OrderFinalizationSummary";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptText } from "lucide-react";
import PromoCodeInput from "@/components/PromoCodeInput";

interface CompactFinancialBlockProps<TFieldValues extends FieldValues & FinalizationFormFields> {
    form: UseFormReturn<TFieldValues>;
    finalCost: number;
    discountAmount?: number;
    discountPercentage?: number;
    // Промокод пропсы
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode?: () => void;
    promoCodeMessage: string;
    isApplyingPromoCode?: boolean;
    className?: string;
}

export default function CompactFinancialBlock<TFieldValues extends FieldValues & FinalizationFormFields>({
    form,
    finalCost,
    discountAmount = 0,
    discountPercentage = 0,
    promoCode,
    setPromoCode,
    applyPromoCode,
    removePromoCode,
    promoCodeMessage,
    isApplyingPromoCode = false,
    className = ""
}: CompactFinancialBlockProps<TFieldValues>) {
    // Внутри работаем с конкретной формой финализации (поля известны)
    const { register, formState: { errors } } = form as unknown as UseFormReturn<FinalizationFormFields>;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Финансовая сводка */}
            <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <ReceiptText className="w-5 h-5 text-sky-600" />
                    Итоговая стоимость
                </h4>
                
                <div className="text-xs text-gray-700 space-y-1.5 border-t pt-2">
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Скидка ({discountPercentage.toFixed(0)}%):</span>
                            <span className="font-medium">- {discountAmount.toLocaleString('ru-RU')} ₽</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1 border-t mt-1">
                        <span>Итого к списанию с баланса:</span>
                        <span className="text-sky-700">{finalCost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>
            </div>

            {/* Компактный лейаут с полями и промокодом */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Левая колонка: Предоплата и Залог */}
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="prepayment_amount" className="text-sm">Предоплата (₽)</Label>
                        <Input 
                            id="prepayment_amount" 
                            type="number" 
                            {...register("prepayment_amount", { 
                                valueAsNumber: true,
                                min: { value: 0, message: "Предоплата не может быть отрицательной" }
                            })}
                            placeholder="0" 
                            className="text-sm"
                        />
                        {errors.prepayment_amount && (
                            <p className="text-xs text-red-600 mt-1">{errors.prepayment_amount.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="deposit_amount" className="text-sm">Залог (₽)</Label>
                        <Input 
                            id="deposit_amount" 
                            type="number" 
                            {...register("deposit_amount", { 
                                valueAsNumber: true,
                                min: { value: 0, message: "Сумма залога не может быть отрицательной" }
                            })}
                            placeholder="0" 
                            className="text-sm"
                        />
                        {errors.deposit_amount && (
                            <p className="text-xs text-red-600 mt-1">{errors.deposit_amount.message}</p>
                        )}
                    </div>
                </div>

                {/* Средняя колонка: Промокод */}
                <div className="space-y-3">
                    <PromoCodeInput
                        promoCode={promoCode}
                        setPromoCode={setPromoCode}
                        applyPromoCode={applyPromoCode}
                        removePromoCode={removePromoCode}
                        promoCodeMessage={promoCodeMessage}
                        isLoading={isApplyingPromoCode}
                    />
                </div>

                {/* Правая колонка: Заметки */}
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="notes_on_issue" className="text-sm">Заметки при выдаче</Label>
                        <Textarea 
                            id="notes_on_issue" 
                            {...register("notes_on_issue")}
                            placeholder="Например: мелкая царапина на корпусе..." 
                            rows={4}
                            className="text-sm resize-none"
                        />
                        {errors.notes_on_issue && (
                            <p className="text-xs text-red-600 mt-1">{errors.notes_on_issue.message}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
