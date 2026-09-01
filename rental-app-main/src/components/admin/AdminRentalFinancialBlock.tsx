// src/components/admin/AdminRentalFinancialBlock.tsx

import React from "react";
import { ReceiptText } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface AdminRentalFinancialBlockProps {
    rental: AdminRentalOut;
}

const AdminRentalFinancialBlock = React.memo(({ rental }: AdminRentalFinancialBlockProps) => {
    return (
        <div className="flex-shrink-0 md:w-64 bg-slate-50 p-3 rounded-lg border space-y-2">
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <ReceiptText className="w-4 h-4"/>Финансы
            </h4>
            <div className="text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                    <span>Общая стоимость:</span> 
                    <span className="font-medium">{rental.total_cost.toLocaleString('ru-RU')} ₽</span>
                </div>
                {rental.accessories_cost > 0 && (
                    <div className="flex justify-between">
                        <span>В т.ч. аксессуары:</span> 
                        <span className="font-medium">{rental.accessories_cost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                )}
                {rental.discount_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Скидка:</span> 
                        <span className="font-medium text-green-600">-{rental.discount_amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                )}
                {rental.prepayment_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Предоплата:</span> 
                        <span className="font-medium text-blue-600">{rental.prepayment_amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                )}
                <div className="flex justify-between pt-1 border-t">
                    <span className="font-semibold text-base">Остаток к оплате:</span>
                    <span className="font-bold text-base">{rental.remaining_amount.toLocaleString('ru-RU')} ₽</span>
                </div>
                {rental.status === 'completed' && rental.final_cost !== null && (
                    <div className="flex justify-between pt-1 border-t border-dashed">
                        <span className="font-semibold">Итоговая стоимость:</span>
                        <span className="font-bold">{rental.final_cost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t text-slate-500">
                    <span>Внесенный залог:</span>
                    <span className="font-medium">{rental.deposit_amount.toLocaleString('ru-RU')} ₽</span>
                </div>
            </div>
        </div>
    );
});

AdminRentalFinancialBlock.displayName = 'AdminRentalFinancialBlock';

export default AdminRentalFinancialBlock;
