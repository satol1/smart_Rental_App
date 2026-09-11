// src/components/admin/ReturnFinancials.tsx

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRentalOut } from "@/types/rental";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";

interface Props {
    rental: AdminRentalOut;
    dynamicRemainingAmount: number;
    paymentAmount: string;
    setPaymentAmount: (value: string) => void;
    paymentDescription: string;
    setPaymentDescription: (value: string) => void;
    paymentApplied: boolean;
    handleApplyPayment: () => void;
    handleCancelPayment: () => void;
    isApplyingPayment: boolean;
    handleAutoFillPayment: () => void;
    overdueSurcharge?: number;
}

export default function ReturnFinancials({
    rental,
    dynamicRemainingAmount,
    paymentAmount,
    setPaymentAmount,
    paymentDescription,
    setPaymentDescription,
    paymentApplied,
    handleApplyPayment,
    handleCancelPayment,
    isApplyingPayment,
    handleAutoFillPayment,
    overdueSurcharge,
}: Props) {
    return (
        <div className="space-y-4 pt-3 border-t">
            <Label className="font-semibold text-base">Финансовая информация</Label>
            
            {/* Информационные поля */}
            <div className="space-y-2 bg-muted p-3 rounded-md">
                <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Текущий баланс клиента:</span>
                    <span className={`font-medium ${getBalanceColor(rental.user.balance)}`}>{formatBalance(rental.user.balance)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Стоимость аренды:</span>
                    <span className="font-medium">{rental.total_cost.toLocaleString()} ₽</span>
                </div>
                {rental.discount_amount > 0 && (
                    <div className="flex justify-between text-success">
                        <span className="text-sm">Скидка:</span>
                        <span className="font-medium">- {rental.discount_amount.toLocaleString()} ₽</span>
                    </div>
                )}
                {rental.promo_code && (
                    <div className="flex justify-between text-muted-foreground">
                        <span className="text-sm">Промокод:</span>
                        <span className="font-medium font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs">{rental.promo_code}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Внесенная предоплата:</span>
                    <span className="font-medium">{rental.prepayment_amount.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Остаток к оплате:</span>
                    <span className={`font-medium ${dynamicRemainingAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                        {dynamicRemainingAmount.toLocaleString()} ₽
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Внесенный залог:</span>
                    <span className="font-medium">{rental.deposit_amount.toLocaleString()} ₽</span>
                </div>
                {overdueSurcharge && overdueSurcharge > 0 && (
                    <div className="flex justify-between text-destructive font-semibold pt-2 border-t border-dashed">
                        <span>Штраф за просрочку:</span>
                        <span>+ {overdueSurcharge.toLocaleString()} ₽</span>
                    </div>
                )}
            </div>

            {/* Поля для платежа */}
            <div className="space-y-3">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="payment_amount">Сумма платежа</Label>
                        {!paymentApplied && dynamicRemainingAmount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAutoFillPayment}
                                className="text-xs h-6 px-2"
                            >
                                Заполнить остаток
                            </Button>
                        )}
                    </div>
                    <Input
                        id="payment_amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Введите сумму"
                        disabled={paymentApplied}
                        className={paymentApplied ? "bg-success-soft border-success/25" : ""}
                    />
                    {paymentApplied && (
                        <p className="text-xs text-success mt-1 flex items-center">
                            <span className="mr-1">✓</span>
                            Платеж учтен
                        </p>
                    )}
                </div>
                
                <div>
                    <Label htmlFor="payment_description">Описание платежа</Label>
                    <Textarea
                        id="payment_description"
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                        placeholder="Например: Частичная оплата при возврате"
                        disabled={paymentApplied}
                        className={paymentApplied ? "bg-success-soft border-success/25" : ""}
                    />
                </div>

                {/* Кнопки управления платежом */}
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyPayment}
                        disabled={!paymentAmount || paymentApplied || isApplyingPayment}
                        className="flex-1"
                    >
                        {isApplyingPayment ? "Обработка..." : "Внести платеж"}
                    </Button>
                    
                    {paymentApplied && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleCancelPayment}
                            className="flex-1"
                        >
                            Отменить платеж
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
