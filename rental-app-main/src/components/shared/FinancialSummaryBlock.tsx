// src/components/shared/FinancialSummaryBlock.tsx

import { Button } from "@/components/ui/button";
import PromoCodeInput from "@/components/PromoCodeInput";
import { ReceiptText, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceDetails } from "@/hooks/reservation/usePriceCalculator";

interface FinancialSummaryBlockProps {
    // Данные о стоимости
    priceDetails?: PriceDetails | null;
    
    // Дополнительные финансовые данные
    accessoriesDailyTotal?: number;
    
    // Промокод
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode?: () => void;
    promoCodeMessage?: string;
    
    // Состояния загрузки
    isLoading?: boolean;
    isApplyingPromoCode?: boolean;
    isSubmitting?: boolean;
    
    // Валидация
    isFormValid?: boolean;
    hasConflicts?: boolean;
    
    // Действия
    onCancel?: () => void;
    onAddMore?: () => void;
    onSubmit?: () => void;
    
    // Стилизация
    variant?: 'default' | 'compact' | 'admin' | 'inline';
    className?: string;
    showActions?: boolean;
}

/**
 * Универсальный компонент для отображения финансовой сводки резерва.
 * Заменяет ReservationSummary, AdminReservationSummary и ReservationFinancialSummary.
 */
export default function FinancialSummaryBlock({
    priceDetails,
    accessoriesDailyTotal = 0,
    promoCode,
    setPromoCode,
    applyPromoCode,
    removePromoCode,
    promoCodeMessage = "",
    isLoading = false,
    isApplyingPromoCode = false,
    isSubmitting = false,
    isFormValid = true,
    hasConflicts = false,
    onCancel,
    onAddMore,
    onSubmit,
    variant = 'default',
    className,
    showActions = true
}: FinancialSummaryBlockProps) {
    
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
    
    // Компактный вариант для карточек
    if (variant === 'compact') {
        return (
            <div className={cn("flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-sm", className)}>
                {promoCode && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 self-end">
                        <span className="px-1.5 py-0.5 bg-purple-100 rounded text-xs">
                            {promoCode}
                        </span>
                    </div>
                )}
                <div className="text-right">
                    <div className="flex items-center gap-1.5 font-semibold">
                        <ReceiptText className="w-4 h-4 text-gray-500" />
                        Итог:
                        <span className="text-gray-800">
                            {finalTotal.toLocaleString('ru-RU')} ₽
                        </span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="text-xs text-green-600 mt-0.5">
                            со скидкой в {discountAmount.toLocaleString('ru-RU')} ₽
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Админский вариант
    if (variant === 'admin') {
        return (
            <div className={cn("flex-1 space-y-2 text-sm", className)}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-600">Дней аренды:</span>
                    <span className="font-medium text-right">{dayCount}</span>

                    <span className="text-gray-600">Сумма без скидки:</span>
                    <span className="font-medium text-right">{fullTotal.toLocaleString('ru-RU')} ₽</span>

                    {totalDiscountPercentage > 0 && (
                        <>
                            <span className="text-green-600">Скидка ({totalDiscountPercentage}%):</span>
                            <span className="font-medium text-green-600 text-right">- {discountAmount.toLocaleString('ru-RU')} ₽</span>
                        </>
                    )}

                    <span className="font-semibold text-base mt-1">Итого:</span>
                    <span className="font-bold text-base text-right mt-1">{finalTotal.toLocaleString('ru-RU')} ₽</span>
                </div>

                <div className="pt-2">
                    <PromoCodeInput
                        promoCode={promoCode}
                        setPromoCode={setPromoCode}
                        applyPromoCode={applyPromoCode}
                        removePromoCode={removePromoCode}
                        promoCodeMessage={displayPromoCodeMessage}
                        disabled={isSubmitting || isLoading}
                        isLoading={isApplyingPromoCode}
                    />
                </div>

                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Проверка доступности...</span>
                    </div>
                )}
                {hasConflicts && (
                    <div className="flex items-center gap-2 text-xs text-red-600 font-medium pt-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Обнаружены конфликты в выборе!</span>
                    </div>
                )}
            </div>
        );
    }
    
    // Inline вариант для редактирования
    if (variant === 'inline') {
        return (
            <div className={cn("space-y-3", className)}>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <ReceiptText className="w-4 h-4" />
                    Финансовая сводка
                </div>
                
                {isLoading ? (
                    <div className="text-center py-4 text-gray-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Расчет стоимости...
                    </div>
                ) : (
                    <div className="text-sm text-gray-700 space-y-2">
                        <div className="flex justify-between">
                            <span>Аренда оборудования ({dayCount} дн.):</span>
                            <span>{fullTotal.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        
                        {accessoriesDailyTotal > 0 && (
                            <div className="flex justify-between text-gray-600 pl-4">
                                <span>- в т.ч. аксессуары ({accessoriesDailyTotal.toLocaleString('ru-RU')} ₽/день):</span>
                                <span>{(accessoriesDailyTotal * dayCount).toLocaleString('ru-RU')} ₽</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between pt-2 border-t border-dashed">
                            <span>Сумма без скидки:</span>
                            <strong>{fullTotal.toLocaleString('ru-RU')} ₽</strong>
                        </div>
                        
                        {totalDiscountPercentage > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Скидка ({totalDiscountPercentage}%):</span>
                                <strong>- {discountAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</strong>
                            </div>
                        )}
                        
                        <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                            <span>К оплате:</span>
                            <span className="text-sky-700 ml-2">{finalTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
                        </div>
                    </div>
                )}
                
                <div className="pt-2">
                    <PromoCodeInput
                        promoCode={promoCode}
                        setPromoCode={setPromoCode}
                        applyPromoCode={applyPromoCode}
                        removePromoCode={removePromoCode}
                        promoCodeMessage={displayPromoCodeMessage}
                        disabled={isSubmitting || isLoading}
                        isLoading={isApplyingPromoCode}
                    />
                </div>
            </div>
        );
    }
    
    // Стандартный вариант (как ReservationSummary)
    return (
        <div className={cn("mt-6 p-4 border rounded-lg bg-white shadow-sm space-y-4", className)}>
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                <ReceiptText className="w-6 h-6 text-sky-600" />
                Итоговый расчет
            </div>

            <div className="border-t pt-4">
                <PromoCodeInput
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
                    applyPromoCode={applyPromoCode}
                    removePromoCode={removePromoCode}
                    promoCodeMessage={displayPromoCodeMessage}
                    disabled={isSubmitting || isLoading}
                    isLoading={isApplyingPromoCode}
                />
            </div>

            {isLoading ? (
                <div className="text-center py-4 text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Расчет стоимости...
                </div>
            ) : (
                <div className="text-sm text-gray-700 space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                        <span>Аренда оборудования ({dayCount} дн.):</span>
                    </div>
                    {accessoriesDailyTotal > 0 && (
                        <div className="flex justify-between text-gray-600 pl-4">
                            <span>- в т.ч. аксессуары ({accessoriesDailyTotal.toLocaleString('ru-RU')} ₽/день):</span>
                            <span>{(accessoriesDailyTotal * dayCount).toLocaleString('ru-RU')} ₽</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-dashed">
                        <span>Сумма без скидки:</span>
                        <strong>{fullTotal.toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    {totalDiscountPercentage > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Скидка ({totalDiscountPercentage}%):</span>
                            <strong>- {discountAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</strong>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                        <span>К оплате:</span>
                        <span className="text-sky-700 ml-2">{finalTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
                    </div>
                </div>
            )}

            {showActions && (onCancel || onAddMore || onSubmit) && (
                <div className="flex flex-col sm:flex-row justify-end items-center pt-3 gap-3">
                    {onCancel && (
                        <Button variant="ghost" className="text-red-600 hover:bg-red-50 w-full sm:w-auto" onClick={onCancel}>
                            Отменить оформление
                        </Button>
                    )}
                    {onAddMore && (
                        <Button variant="outline" className="w-full sm:w-auto" onClick={onAddMore}>
                            Добавить оборудование
                        </Button>
                    )}
                    {onSubmit && (
                        <Button
                            disabled={!isFormValid || isSubmitting || isLoading || isApplyingPromoCode}
                            className="px-6 py-2 w-full sm:w-auto"
                            onClick={onSubmit}
                        >
                            {isSubmitting ? "Обработка..." : "Подтвердить резерв"}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
