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
            <div className={cn("flex-shrink-0 md:w-64 bg-slate-50 p-3 rounded-lg border space-y-2", className)}>
                <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <ReceiptText className="w-4 h-4"/>Финансы
                </h4>
                <div className="text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                        <span>Общая стоимость:</span>
                        <span className="font-medium">{totalCost != null ? <MoneyText value={totalCost} /> : 'Н/Д'}</span>
                    </div>
                    {promoCode && (
                        <div className="flex justify-between">
                            <span>Промокод:</span>
                            <span className="font-medium text-purple-600">{promoCode}</span>
                        </div>
                    )}
                    {(discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span>Скидка:</span>
                            <span className="font-medium text-green-600">-<MoneyText value={discountAmount} /></span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Компактный и стандартный стили (объединены для устранения дублирования)
    const isCompact = variant === 'compact';
    const containerClasses = isCompact 
        ? "flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-sm pt-2 border-t border-dashed"
        : "flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-sm";
    
    return (
        <div className={cn(containerClasses, className)}>
            {promoCode && (
                <div className="flex items-center gap-1.5 text-xs text-purple-600 self-end">
                    <Tag className="w-3 h-3" />
                    <span>{promoCode}</span>
                </div>
            )}
            <div className="text-right">
                <div className="flex items-center gap-1.5 font-semibold">
                    <Receipt className="w-4 h-4 text-gray-500" />
                    Итог:
                    <span className="text-gray-800">
                        {totalCost != null ? <MoneyText value={totalCost} /> : 'Н/Д'}
                    </span>
                </div>
                {(discountAmount ?? 0) > 0 && (
                    <div className="text-xs text-green-600 mt-0.5">
                        со скидкой в {formatMoney(discountAmount)}
                    </div>
                )}
            </div>
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(FinancialInfoBlockComponent);
