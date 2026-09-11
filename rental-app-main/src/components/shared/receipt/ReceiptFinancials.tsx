import { Separator } from "@/components/ui/separator";
import type { AdminRentalOut } from "@/types/rental";

interface ReceiptFinancialsProps {
    rentalData: Pick<AdminRentalOut, 'total_cost' | 'discount_amount' | 'prepayment_amount' | 'remaining_amount'> & {
        promo_code?: string | null;
    };
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    isCompact?: boolean;
    /** @deprecated Kept for backward compatibility; the section uses a single responsive design. */
    useCard?: boolean;
}

export default function ReceiptFinancials({ rentalData }: ReceiptFinancialsProps) {
    return (
        <section className="receipt-section receipt-financials">
            <h3 className="receipt-section-title mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Стоимость аренды
            </h3>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Общая стоимость:</span>
                    <span className="text-sm font-medium text-foreground">{rentalData.total_cost.toLocaleString()} ₽</span>
                </div>
                {rentalData.discount_amount > 0 && (
                    <div className="flex items-center justify-between text-success">
                        <span className="text-sm">Размер скидки:</span>
                        <span className="text-sm font-medium">-{rentalData.discount_amount.toLocaleString()} ₽</span>
                    </div>
                )}
                {rentalData.promo_code && (
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm">Промокод:</span>
                        <span className="font-mono text-sm font-medium">{rentalData.promo_code}</span>
                    </div>
                )}
                {rentalData.prepayment_amount > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Размер предоплаты:</span>
                        <span className="text-sm font-medium text-foreground">{rentalData.prepayment_amount.toLocaleString()} ₽</span>
                    </div>
                )}
                <Separator className="receipt-financials-separator my-1.5" />
                <div className="receipt-financials-total flex items-center justify-between text-base font-bold">
                    <span className="text-foreground">Остаток к оплате:</span>
                    <span className="text-primary">
                        {rentalData.remaining_amount.toLocaleString()} ₽
                    </span>
                </div>
            </div>
        </section>
    );
}
