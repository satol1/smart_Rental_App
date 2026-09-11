import { useId } from "react";
import { useTranslation } from "react-i18next";
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
    // Структурный флаг успеха применения промокода
    promoCodeValid: boolean;
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
    promoCodeValid,
    isApplyingPromoCode = false,
    className = ""
}: CompactFinancialBlockProps<TFieldValues>) {
    const id = useId();
    const { t } = useTranslation();
    // Внутри работаем с конкретной формой финализации (поля известны)
    const { register, formState: { errors } } = form as unknown as UseFormReturn<FinalizationFormFields>;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Финансовая сводка */}
            <div className="border-b border-border pb-5 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ReceiptText className="w-5 h-5 text-primary" />
                    {t('ordersDesign.finalCost')}
                </h4>

                <div className="text-xs text-foreground space-y-1.5 border-t pt-2">
                    {discountAmount > 0 && (
                        <div className="flex justify-between gap-3 text-success">
                            <span>Скидка ({discountPercentage.toFixed(0)}%):</span>
                            <span className="font-medium">- {discountAmount.toLocaleString('ru-RU')} ₽</span>
                        </div>
                    )}
                    <div className="flex justify-between gap-3 text-base font-bold pt-1 border-t mt-1">
                        <span>{t('ordersDesign.balanceDebit')}</span>
                        <span className="text-2xl font-semibold tabular-nums text-foreground">{finalCost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                </div>
            </div>

            {/* Компактный лейаут с полями и промокодом */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Левая колонка: Предоплата и Залог */}
                <div className="space-y-3">
                    <div>
                        <Label htmlFor={id + "-prepayment_amount"} className="text-sm">{t('ordersDesign.prepayment')}</Label>
                        <Input
                            id={id + "-prepayment_amount"}
                        aria-invalid={!!errors.prepayment_amount}
                        aria-describedby={errors.prepayment_amount ? id + "-prepayment_amount-error" : undefined}
                            type="number" inputMode="decimal" min={0}
                            {...register("prepayment_amount", {
                                valueAsNumber: true,
                                min: { value: 0, message: t('ordersDesign.negativePrepayment') }
                            })}
                            placeholder="0"
                            className="text-sm"
                        />
                        {errors.prepayment_amount && (
                            <p id={id + "-prepayment_amount-error"} className="text-xs text-destructive mt-1">{errors.prepayment_amount.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor={id + "-deposit_amount"} className="text-sm">{t('ordersDesign.deposit')}</Label>
                        <Input
                            id={id + "-deposit_amount"}
                        aria-invalid={!!errors.deposit_amount}
                        aria-describedby={errors.deposit_amount ? id + "-deposit_amount-error" : undefined}
                            type="number" inputMode="decimal" min={0}
                            {...register("deposit_amount", {
                                valueAsNumber: true,
                                min: { value: 0, message: t('ordersDesign.negativeDeposit') }
                            })}
                            placeholder="0"
                            className="text-sm"
                        />
                        {errors.deposit_amount && (
                            <p id={id + "-deposit_amount-error"} className="text-xs text-destructive mt-1">{errors.deposit_amount.message}</p>
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
                        promoCodeValid={promoCodeValid}
                        isLoading={isApplyingPromoCode}
                    />
                </div>

                {/* Правая колонка: Заметки */}
                <div className="space-y-3">
                    <div>
                        <Label htmlFor={id + "-notes_on_issue"} className="text-sm">{t('ordersDesign.issueNotes')}</Label>
                        <Textarea
                            id={id + "-notes_on_issue"}
                        aria-invalid={!!errors.notes_on_issue}
                        aria-describedby={errors.notes_on_issue ? id + "-notes_on_issue-error" : undefined}
                            {...register("notes_on_issue")}
                            placeholder={t('ordersDesign.issueNotesPlaceholder')}
                            rows={4}
                            className="text-sm"
                        />
                        {errors.notes_on_issue && (
                            <p id={id + "-notes_on_issue-error"} className="text-xs text-destructive mt-1">{errors.notes_on_issue.message}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
