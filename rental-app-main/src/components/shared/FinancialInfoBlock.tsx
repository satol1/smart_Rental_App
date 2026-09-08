// src/components/shared/FinancialInfoBlock.tsx

import React from "react";
import { Tag, Receipt, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyText, formatMoney } from "@/components/ui/money-text";

interface FinancialInfoBlockProps {
    totalCost?: number | null;
    discountAmount?: number | null;
    promoCode?: string | null;
    variant?: 'default' | 'compact' | 'admin';
    className?: string;
}

const FinancialInfoBlockComponent = ({
    totalCost,
    discountAmount,
    promoCode,
    variant = 'default',
    className
}: FinancialInfoBlockProps) => {
    // Админский стиль - как в AdminRentalCard
    if (variant === 'admin') {
        return (
            <div className={cn("flex-shrink-0 md:w-64 bg-secondary/50 p-3.5 rounded-xl border border-border/70 space-y-2.5", className)}>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ReceiptText className="w-3.5 h-3.5 text-primary"/>Финансовый расчёт
                </h4>
                <div className="text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Итого к оплате:</span>
                        <span className="font-bold text-sm text-foreground">{totalCost != null ? <MoneyText value={totalCost} /> : 'Н/Д'}</span>
                    </div>
                    {promoCode && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Промокод:</span>
                            <span className="font-medium text-pastel-lavender-fg bg-pastel-lavender px-2 py-0.5 rounded-full border border-purple-200/50">{promoCode}</span>
                        </div>
                    )}
                    {(discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Скидка:</span>
                            <span className="font-semibold text-pastel-mint-fg bg-pastel-mint px-2 py-0.5 rounded-full border border-emerald-200/50">-<MoneyText value={discountAmount} /></span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Компактный и стандартный стили
    const isCompact = variant === 'compact';
    const containerClasses = isCompact 
        ? "flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 text-sm pt-2 border-t border-dashed border-border/70"
        : "flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 text-sm";
    
    return (
        <div className={cn(containerClasses, className)}>
            {promoCode && (
                <div className="inline-flex items-center gap-1 text-xs font-medium text-pastel-lavender-fg bg-pastel-lavender px-2.5 py-0.5 rounded-full border border-purple-200/50">
                    <Tag className="w-3 h-3" />
                    <span>{promoCode}</span>
                </div>
            )}
            <div className="text-right flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Receipt className="w-4 h-4 text-primary/70" />
                    <span className="text-muted-foreground font-normal text-xs uppercase tracking-wider">Итог:</span>
                    <span className="text-foreground font-bold text-base">
                        {totalCost != null ? <MoneyText value={totalCost} /> : 'Н/Д'}
                    </span>
                </div>
                {(discountAmount ?? 0) > 0 && (
                    <span className="text-xs font-medium text-pastel-mint-fg bg-pastel-mint px-2 py-0.5 rounded-full border border-emerald-200/50">
                        выгода {formatMoney(discountAmount)}
                    </span>
                )}
            </div>
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(FinancialInfoBlockComponent);
