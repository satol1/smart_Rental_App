// src/components/shared/OrderFinalizationSummary.tsx

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptText } from "lucide-react";

interface OrderFinalizationSummaryProps {
    form: UseFormReturn<{
        deposit_amount?: number;
        prepayment_amount?: number;
        notes_on_issue?: string;
    }>;
    finalCost: number;
    discountAmount?: number;
    discountPercentage?: number;
    className?: string;
}

export default function OrderFinalizationSummary({
    form,
    finalCost,
    discountAmount = 0,
    discountPercentage = 0,
    className = ""
}: OrderFinalizationSummaryProps) {
    const { register, formState: { errors } } = form;

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

            {/* Поля для ввода финансовых деталей */}
            <div className="space-y-4">
                <div>
                    <Label htmlFor="deposit_amount">Сумма залога (₽)</Label>
                    <Input 
                        id="deposit_amount" 
                        type="number" 
                        {...register("deposit_amount", { 
                            valueAsNumber: true,
                            min: { value: 0, message: "Сумма залога не может быть отрицательной" }
                        })}
                        placeholder="0" 
                    />
                    {errors.deposit_amount && (
                        <p className="text-sm text-red-600 mt-1">{errors.deposit_amount.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="prepayment_amount">Предоплата (₽)</Label>
                    <Input 
                        id="prepayment_amount" 
                        type="number" 
                        {...register("prepayment_amount", { 
                            valueAsNumber: true,
                            min: { value: 0, message: "Предоплата не может быть отрицательной" }
                        })}
                        placeholder="0" 
                    />
                    {errors.prepayment_amount && (
                        <p className="text-sm text-red-600 mt-1">{errors.prepayment_amount.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="notes_on_issue">Заметки при выдаче</Label>
                    <Textarea 
                        id="notes_on_issue" 
                        {...register("notes_on_issue")}
                        placeholder="Например: мелкая царапина на корпусе..." 
                        rows={3}
                    />
                    {errors.notes_on_issue && (
                        <p className="text-sm text-red-600 mt-1">{errors.notes_on_issue.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
