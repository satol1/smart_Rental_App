// components/admin/ActiveRentalFinancialBlock.tsx

import { ReceiptText, Loader2 } from "lucide-react";
import PromoCodeInput from "@/components/PromoCodeInput";
import type { PriceDetails } from "@/hooks/reservation/usePriceCalculator";
import type { AdminRentalOut } from "@/types/rental";

interface ActiveRentalFinancialBlockProps {
    // Данные о стоимости
    priceDetails?: PriceDetails | null;

    // Данные аренды
    rental: AdminRentalOut;

    // Промокод
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode?: () => void;
    promoCodeMessage?: string;
    // Структурный флаг успеха применения промокода
    promoCodeValid: boolean;

    // Состояния загрузки
    isLoading?: boolean;
    isApplyingPromoCode?: boolean;

    // Стилизация
    className?: string;
}

/**
 * Специализированный компонент для отображения финансовой информации активной аренды.
 * Показывает текущую стоимость, предоплату, остаток к оплате и позволяет управлять промокодами.
 */
export default function ActiveRentalFinancialBlock({
    priceDetails,
    rental,
    promoCode,
    setPromoCode,
    applyPromoCode,
    removePromoCode,
    promoCodeMessage = "",
    promoCodeValid = false,
    isLoading = false,
    isApplyingPromoCode = false,
    className
}: ActiveRentalFinancialBlockProps) {

    // Извлекаем данные из priceDetails
    const dayCount = priceDetails?.day_count ?? 0;
    const fullTotal = priceDetails?.full_total ?? 0;
    const finalTotal = priceDetails?.final_total ?? 0;
    const discountAmount = priceDetails?.discount_amount ?? 0;
    const durationDiscountPercentage = priceDetails?.duration_discount_percentage ?? 0;
    const promoDiscountPercentage = priceDetails?.promo_discount_percentage ?? 0;
    const totalDiscountPercentage = durationDiscountPercentage + promoDiscountPercentage;
    const apiPromoCodeMessage = priceDetails?.promo_code_message ?? "";

    // Если промокод очищен, не показываем старое сообщение из API до пересчёта
    const displayPromoCodeMessage = (promoCode && promoCode.length > 0)
        ? (apiPromoCodeMessage || promoCodeMessage)
        : "";

    // Используем пересчитанные данные, если они есть, иначе текущие данные аренды
    const currentTotalCost = finalTotal > 0 ? finalTotal : rental.total_cost;
    const currentDiscountAmount = discountAmount > 0 ? discountAmount : rental.discount_amount;
    const currentDayCount = dayCount > 0 ? dayCount : 0;

    // Рассчитываем остаток к оплате
    const remainingAmount = currentTotalCost - rental.prepayment_amount;

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ReceiptText className="w-4 h-4" />
                Финансовая сводка
            </div>

            {isLoading ? (
                <div className="text-center py-4 text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Расчет стоимости...
                </div>
            ) : (
                <div className="text-sm text-foreground space-y-2">
                    {/* Информация о пересчете */}
                    {priceDetails && (
                        <div className="p-2 bg-info-soft rounded border border-border">
                            <div className="text-xs text-primary font-medium mb-1">
                                Пересчет по новым условиям:
                            </div>
                            <div className="text-xs text-primary">
                                {currentDayCount} дн. • {fullTotal.toLocaleString('ru-RU')} ₽
                                {totalDiscountPercentage > 0 && (
                                    <span> • скидка {totalDiscountPercentage}%</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Основная финансовая информация */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between gap-3">
                            <span>Стоимость аренды:</span>
                            <span className="font-medium">{currentTotalCost.toLocaleString('ru-RU')} ₽</span>
                        </div>

                        {currentDiscountAmount > 0 && (
                            <div className="flex justify-between gap-3 text-success">
                                <span>Скидка:</span>
                                <span className="font-medium">-{currentDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                            </div>
                        )}

                        {rental.promo_code && (
                            <div className="flex justify-between gap-3 text-primary">
                                <span>Промокод:</span>
                                <span className="font-medium">{rental.promo_code}</span>
                            </div>
                        )}

                        <div className="flex justify-between gap-3 pt-1 border-t border-border">
                            <span>Предоплата:</span>
                            <span className="font-medium text-primary">{rental.prepayment_amount.toLocaleString('ru-RU')} ₽</span>
                        </div>

                        <div className="flex justify-between gap-3 text-base font-bold pt-1 border-t">
                            <span>Остаток к оплате:</span>
                            <span className={`ml-2 ${remainingAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                                {remainingAmount.toLocaleString('ru-RU')} ₽
                            </span>
                        </div>

                        {remainingAmount < 0 && (
                            <div className="text-xs text-success bg-success-soft p-2 rounded">
                                Переплата: {Math.abs(remainingAmount).toLocaleString('ru-RU')} ₽
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Управление промокодами */}
            <div className="pt-2">
                <PromoCodeInput
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    applyPromoCode={applyPromoCode}
                    removePromoCode={removePromoCode}
                    promoCodeMessage={displayPromoCodeMessage}
                    promoCodeValid={promoCodeValid}
                    disabled={isLoading}
                    isLoading={isApplyingPromoCode}
                />
            </div>
        </div>
    );
}
