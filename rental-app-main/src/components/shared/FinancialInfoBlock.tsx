import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MoneyText } from '@/components/ui/money-text';
import { formatMoney } from '@/lib/money';

interface FinancialInfoBlockProps {
    totalCost?: number | null;
    discountAmount?: number | null;
    promoCode?: string | null;
    variant?: 'default' | 'compact' | 'admin';
    className?: string;
}

function FinancialInfoBlock({ totalCost, discountAmount, promoCode, variant = 'default', className }: FinancialInfoBlockProps) {
    const { t } = useTranslation();
    const isAdmin = variant === 'admin';
    return (
        <div className={cn(
            'min-w-0 tabular-nums',
            isAdmin ? 'space-y-2 text-sm lg:w-52 lg:shrink-0' : 'flex flex-wrap items-center gap-x-4 gap-y-2 text-sm',
            variant === 'compact' && 'border-t border-border pt-3', className,
        )}>
            <div className={cn('flex items-baseline gap-3', isAdmin && 'flex-col gap-1')}>
                <span className="text-sm text-muted-foreground">{t(isAdmin ? 'ordersDesign.totalAdmin' : 'ordersDesign.total')}</span>
                <span className={cn('whitespace-nowrap font-semibold tracking-tight text-foreground', isAdmin ? 'text-2xl' : 'text-lg')}>
                    {totalCost != null ? <MoneyText value={totalCost} /> : t('ordersDesign.unavailableAmount')}
                </span>
            </div>
            {(discountAmount ?? 0) > 0 && (
                <span className="block text-xs text-success">
                    {t('ordersDesign.discountSaving', { amount: formatMoney(discountAmount) })}
                </span>
            )}
            {promoCode && (
                <span className="inline-flex max-w-full items-center gap-2 text-xs text-muted-foreground">
                    {t('ordersDesign.promoCode')}
                    <span className="break-all rounded-md bg-muted px-2 py-1 font-medium text-foreground">{promoCode}</span>
                </span>
            )}
        </div>
    );
}
export default React.memo(FinancialInfoBlock);
