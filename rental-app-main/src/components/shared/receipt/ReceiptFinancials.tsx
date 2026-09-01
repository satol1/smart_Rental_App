import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptFinancialsProps {
    rentalData: Pick<AdminRentalOut, 'total_cost' | 'discount_amount' | 'prepayment_amount' | 'remaining_amount'>;
    isCompact?: boolean;
    useCard?: boolean;
}

export default function ReceiptFinancials({ rentalData, isCompact = false, useCard = true }: ReceiptFinancialsProps) {
    const content = (
        <>
            <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold ${!useCard ? 'mb-1' : ''}`}>
                Стоимость аренды
            </h3>
            <div className={isCompact ? "space-y-1" : "space-y-2"}>
                <div className="flex justify-between items-center">
                    <span className={isCompact ? "text-xs" : "text-sm"}>Общая стоимость:</span>
                    <span className={`${isCompact ? 'text-sm' : ''} font-medium`}>{rentalData.total_cost.toLocaleString()} ₽</span>
                </div>
                {rentalData.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                        <span className={isCompact ? "text-xs" : "text-sm"}>Размер скидки:</span>
                        <span className={`${isCompact ? 'text-sm' : ''} font-medium`}>-{rentalData.discount_amount.toLocaleString()} ₽</span>
                    </div>
                )}
                {rentalData.prepayment_amount > 0 && (
                    <div className="flex justify-between items-center">
                        <span className={isCompact ? "text-xs" : "text-sm"}>Размер предоплаты:</span>
                        <span className={`${isCompact ? 'text-sm' : ''} font-medium`}>{rentalData.prepayment_amount.toLocaleString()} ₽</span>
                    </div>
                )}
                <Separator className={isCompact ? "my-1" : ""} />
                <div className={`flex justify-between items-center ${isCompact ? 'text-sm' : 'text-base'} font-bold`}>
                    <span>Остаток к оплате:</span>
                    <span className="text-blue-600">
                        {rentalData.remaining_amount.toLocaleString()} ₽
                    </span>
                </div>
            </div>
        </>
    );

    if (!useCard) {
        return (
            <div className="border-t pt-2 mt-2">
                {content}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className={isCompact ? "pb-2" : "pb-2"}>
                {content}
            </CardHeader>
        </Card>
    );
}
