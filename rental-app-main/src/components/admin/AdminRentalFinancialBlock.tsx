// src/components/admin/AdminRentalFinancialBlock.tsx

import React from "react";
import { ReceiptText } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";
import { MoneyText } from "@/components/ui/money-text";

interface AdminRentalFinancialBlockProps {
    rental: AdminRentalOut;
}

const AdminRentalFinancialBlock = React.memo(({ rental }: AdminRentalFinancialBlockProps) => {
    return (
        <div className="min-w-0 space-y-3 tabular-nums xl:w-64 xl:shrink-0">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <ReceiptText className="w-4 h-4"/>Финансы
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between gap-3">
                    <span>Общая стоимость:</span>
                    <span className="font-medium"><MoneyText value={rental.total_cost} /></span>
                </div>
                {rental.accessories_cost > 0 && (
                    <div className="flex justify-between gap-3">
                        <span>В т.ч. аксессуары:</span>
                        <span className="font-medium"><MoneyText value={rental.accessories_cost} /></span>
                    </div>
                )}
                {rental.discount_amount > 0 && (
                    <div className="flex justify-between gap-3">
                        <span>Скидка:</span>
                        <span className="font-medium text-success">-<MoneyText value={rental.discount_amount} /></span>
                    </div>
                )}
                {rental.promo_code && (
                    <div className="flex justify-between gap-3 text-muted-foreground">
                        <span>Промокод:</span>
                        <span className="font-medium font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs">{rental.promo_code}</span>
                    </div>
                )}
                {rental.prepayment_amount > 0 && (
                    <div className="flex justify-between gap-3">
                        <span>Предоплата:</span>
                        <span className="font-medium text-primary"><MoneyText value={rental.prepayment_amount} /></span>
                    </div>
                )}
                <div className="flex justify-between gap-3 pt-1 border-t">
                    <span className="font-medium text-foreground">Остаток к оплате:</span>
                    <span className="font-semibold text-lg text-foreground"><MoneyText value={rental.remaining_amount} /></span>
                </div>
                {rental.status === 'completed' && rental.final_cost !== null && (
                    <div className="flex justify-between gap-3 pt-1 border-t border-border">
                        <span className="font-semibold">Итоговая стоимость:</span>
                        <span className="font-bold"><MoneyText value={rental.final_cost} /></span>
                    </div>
                )}
                <div className="flex justify-between gap-3 pt-2 border-t text-muted-foreground">
                    <span>Внесенный залог:</span>
                    <span className="font-medium"><MoneyText value={rental.deposit_amount} /></span>
                </div>
            </div>
        </div>
    );
});

AdminRentalFinancialBlock.displayName = 'AdminRentalFinancialBlock';

export default AdminRentalFinancialBlock;
