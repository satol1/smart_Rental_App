import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PromoCodeInput from '@/components/PromoCodeInput';
import { Loader2, AlertTriangle, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneyText } from '@/components/ui/money-text';
import type { PriceDetails } from '@/hooks/reservation/usePriceCalculator';

interface FinancialSummaryBlockProps {
    priceDetails?: PriceDetails | null;
    accessoriesDailyTotal?: number;
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode?: () => void;
    promoCodeMessage?: string;
    isLoading?: boolean;
    isApplyingPromoCode?: boolean;
    isSubmitting?: boolean;
    isFormValid?: boolean;
    hasConflicts?: boolean;
    formInvalidReason?: string | null;
    cancellationPolicyNote?: string;
    onCancel?: () => void;
    onAddMore?: () => void;
    onSubmit?: () => void;
    variant?: 'default' | 'compact' | 'admin' | 'inline';
    className?: string;
    showActions?: boolean;
}

export default function FinancialSummaryBlock({
    priceDetails, accessoriesDailyTotal = 0, promoCode, setPromoCode, applyPromoCode, removePromoCode,
    promoCodeMessage = '', isLoading = false, isApplyingPromoCode = false, isSubmitting = false,
    isFormValid = true, hasConflicts = false, formInvalidReason = null, cancellationPolicyNote,
    onCancel, onAddMore, onSubmit, variant = 'default', className, showActions = true,
}: FinancialSummaryBlockProps) {
    const { t } = useTranslation();
    const reasonId = useId();
    const dayCount = priceDetails?.day_count ?? 0;
    const fullTotal = priceDetails?.full_total ?? 0;
    const finalTotal = priceDetails?.final_total ?? 0;
    const discountAmount = priceDetails?.discount_amount ?? 0;
    const discountPercentage = (priceDetails?.duration_discount_percentage ?? 0) + (priceDetails?.promo_discount_percentage ?? 0);
    const displayPromoCodeMessage = promoCode ? (priceDetails?.promo_code_message || promoCodeMessage) : '';

    if (variant === 'compact') {
        return (
            <div className={cn('flex flex-wrap items-baseline gap-3 text-sm tabular-nums', className)}>
                <span className="text-muted-foreground">{t('ordersDesign.total')}</span>
                <strong className="text-lg font-semibold text-foreground"><MoneyText value={finalTotal} /></strong>
                {discountAmount > 0 && <span className="text-xs text-success">−<MoneyText value={discountAmount} /></span>}
                {promoCode && <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{promoCode}</span>}
            </div>
        );
    }

    return (
        <section className={cn(
            'min-w-0 space-y-5 text-foreground',
            variant === 'default' && 'rounded-2xl border border-border bg-card p-5 sm:p-6',
            className,
        )} aria-busy={isLoading}>
            <h2 className="text-lg font-semibold tracking-tight">{t('ordersDesign.summary')}</h2>
            {isLoading ? (
                <div role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t('ordersDesign.calculating')}
                </div>
            ) : (
                <dl className="space-y-3 text-sm tabular-nums">
                    <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">{t('ordersDesign.rentalDays', { count: dayCount })}</dt>
                        <dd className="shrink-0 font-medium"><MoneyText value={fullTotal} /></dd>
                    </div>
                    {accessoriesDailyTotal > 0 && (
                        <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                            <dt>{t('ordersDesign.accessoriesIncluded')}</dt>
                            <dd className="shrink-0"><MoneyText value={accessoriesDailyTotal * dayCount} /></dd>
                        </div>
                    )}
                    {discountPercentage > 0 && (
                        <div className="flex items-start justify-between gap-4 text-success">
                            <dt>{t('ordersDesign.discount', { percent: discountPercentage })}</dt>
                            <dd className="shrink-0 font-medium">−<MoneyText value={discountAmount} /></dd>
                        </div>
                    )}
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-4">
                        <dt className="font-medium">{t('ordersDesign.payable')}</dt>
                        <dd className="text-3xl font-semibold tracking-tight text-foreground"><MoneyText value={finalTotal} /></dd>
                    </div>
                </dl>
            )}
            <div className="border-t border-border pt-4">
                <PromoCodeInput promoCode={promoCode} setPromoCode={setPromoCode} applyPromoCode={applyPromoCode}
                    removePromoCode={removePromoCode} promoCodeMessage={displayPromoCodeMessage}
                    disabled={isSubmitting || isLoading} isLoading={isApplyingPromoCode} />
            </div>
            {hasConflicts && (
                <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t('ordersDesign.conflicts')}
                </p>
            )}
            {cancellationPolicyNote && (
                <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{cancellationPolicyNote}</p>
                </div>
            )}
            {showActions && variant === 'default' && (onCancel || onAddMore || onSubmit) && (
                <div className="space-y-2 border-t border-border pt-4">
                    {onSubmit && (
                        <Button disabled={!isFormValid || isSubmitting || isLoading || isApplyingPromoCode}
                            aria-describedby={!isFormValid && formInvalidReason ? reasonId : undefined}
                            className="w-full" onClick={onSubmit}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t(isSubmitting ? 'ordersDesign.submitting' : 'ordersDesign.confirm')}
                        </Button>
                    )}
                    {onAddMore && <Button variant="outline" className="w-full" onClick={onAddMore}>{t('ordersDesign.addEquipment')}</Button>}
                    {onCancel && <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={onCancel}>{t('ordersDesign.cancelCheckout')}</Button>}
                </div>
            )}
            {onSubmit && !isFormValid && formInvalidReason && (
                <p id={reasonId} role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">{formInvalidReason}</p>
            )}
        </section>
    );
}
