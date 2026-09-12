import { useId } from "react";
import { useTranslation } from "react-i18next";
// src/components/shared/OrderFinalizationSummary.tsx

import type { UseFormReturn, FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptText } from "lucide-react";
import { MoneyText } from "@/components/ui/money-text";

/** Поля финализации заказа, которые регистрирует сводка */
export interface FinalizationFormFields {
    deposit_amount?: number;
    prepayment_amount?: number;
    notes_on_issue?: string;
}

interface OrderFinalizationSummaryProps<TFieldValues extends FieldValues & FinalizationFormFields> {
    form: UseFormReturn<TFieldValues>;
    finalCost: number;
    discountAmount?: number;
    discountPercentage?: number;
    className?: string;
    hideSummary?: boolean;
}

export default function OrderFinalizationSummary<TFieldValues extends FieldValues & FinalizationFormFields>({
    form,
    finalCost,
    discountAmount = 0,
    discountPercentage = 0,
    className = "",
    hideSummary = false
}: OrderFinalizationSummaryProps<TFieldValues>) {
    const id = useId();
    const { t } = useTranslation();
    // Внутри работаем с конкретной формой финализации (поля известны)
    const { register, formState: { errors } } = form as unknown as UseFormReturn<FinalizationFormFields>;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Финансовая сводка (если не скрыта) */}
            {!hideSummary && (
                <div className="border-b border-border pb-5 space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ReceiptText className="w-5 h-5 text-primary" />
                        {t('ordersDesign.finalCost')}
                    </h4>

                    <div className="text-xs text-foreground space-y-1.5 border-t pt-2">
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-success">
                                <span>Скидка ({discountPercentage.toFixed(0)}%):</span>
                                <span className="font-medium">- <MoneyText value={discountAmount} /></span>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-between items-baseline gap-3 text-base font-semibold pt-3 border-t border-border mt-3">
                            <span>{t('ordersDesign.balanceDebit')}</span>
                            <span className="text-2xl font-semibold tabular-nums text-foreground"><MoneyText value={finalCost} /></span>
                        </div>
                    </div>
                </div>
            )}

            {/* Поля для ввода финансовых деталей */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor={id + "-deposit_amount"}>{t('ordersDesign.deposit')}</Label>
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
                    />
                    {errors.deposit_amount && (
                        <p id={id + "-deposit_amount-error"} className="text-sm text-destructive mt-1">{errors.deposit_amount.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor={id + "-prepayment_amount"}>{t('ordersDesign.prepayment')}</Label>
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
                    />
                    {errors.prepayment_amount && (
                        <p id={id + "-prepayment_amount-error"} className="text-sm text-destructive mt-1">{errors.prepayment_amount.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor={id + "-notes_on_issue"}>{t('ordersDesign.issueNotes')}</Label>
                    <Textarea
                        id={id + "-notes_on_issue"}
                        aria-invalid={!!errors.notes_on_issue}
                        aria-describedby={errors.notes_on_issue ? id + "-notes_on_issue-error" : undefined}
                        {...register("notes_on_issue")}
                        placeholder={t('ordersDesign.issueNotesPlaceholder')}
                        rows={3}
                    />
                    {errors.notes_on_issue && (
                        <p id={id + "-notes_on_issue-error"} className="text-sm text-destructive mt-1">{errors.notes_on_issue.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
