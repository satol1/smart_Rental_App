// src/components/admin/ReservationFinancialSummary.tsx

import { useMemo } from "react";
import { usePriceCalculator } from "@/hooks/reservation/usePriceCalculator";
import { AlertCircle, Loader2, ReceiptText } from "lucide-react";
import type { AdminReservationOut } from "@/types/reservation";
import { MoneyText } from "@/components/ui/money-text";
import type { Equipment } from "@/types/equipment"; // Импортируем тип Equipment

interface ReservationFinancialSummaryProps {
    reservation: AdminReservationOut;
    open: boolean;
    hasConflicts: boolean;
    conflictingItemIds: number[];
    isCheckingAvailability: boolean;
    equipmentMap: Map<number, Equipment>;
    priceDetails?: any;
    isCalculatingPrice?: boolean;
    priceError?: any;
}

export default function ReservationFinancialSummary({
                                                        reservation,
                                                        open,
                                                        hasConflicts,
                                                        conflictingItemIds,
                                                        isCheckingAvailability,
                                                        equipmentMap,
                                                        priceDetails: propPriceDetails,
                                                        isCalculatingPrice: propIsCalculatingPrice,
                                                        priceError: propPriceError
                                                    }: ReservationFinancialSummaryProps) {

    const { newStartDate, newEndDate, newDateRangeIsValid } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const originalEndDate = new Date(reservation.end_date);
        originalEndDate.setHours(0, 0, 0, 0);

        return {
            newStartDate: today,
            newEndDate: originalEndDate,
            newDateRangeIsValid: originalEndDate >= today,
        };
    }, [reservation]);

    const fallbackCalculator = usePriceCalculator({
        equipmentIds: reservation.equipment_ids || [],
        startDate: newStartDate!,
        endDate: newEndDate!,
        selectedAccessories: reservation.selected_accessories || {},
        promoCode: reservation.promo_code || undefined,
        enabled: open && newDateRangeIsValid && propPriceDetails === undefined,
    });

    const priceDetails = propPriceDetails ?? fallbackCalculator.data;
    const isCalculatingPrice = propIsCalculatingPrice ?? fallbackCalculator.isFetching;
    const priceError = propPriceError ?? fallbackCalculator.error;

    const finalCost = priceDetails?.final_total ?? reservation.total_cost ?? 0;

    // +++ Получаем имена конфликтного оборудования +++
    const conflictingEquipmentNames = useMemo(() =>
            conflictingItemIds.map(id => equipmentMap.get(id)?.name).filter(Boolean).join(', '),
        [conflictingItemIds, equipmentMap]);

    return (
        <div className="p-3 bg-muted border rounded-lg space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ReceiptText className="w-5 h-5 text-primary" />
                Финансовая сводка
            </h4>

            {(isCalculatingPrice || isCheckingAvailability) ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isCheckingAvailability ? "Проверка доступности..." : "Пересчет стоимости..."}
                </div>
            ) : hasConflicts ? (
                // +++ НАЧАЛО: Новый блок для отображения ошибки конфликта +++
                <div className="text-sm text-destructive font-medium p-2 bg-danger-soft border border-destructive/25 rounded-md space-y-1">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Конфликт бронирования!</span>
                    </div>
                    <p className="text-xs font-normal pl-6">
                        Оборудование недоступно в новом периоде: <strong>{conflictingEquipmentNames}</strong>.
                    </p>
                </div>
                // +++ КОНЕЦ: Новый блок +++
            ) : priceError || !newDateRangeIsValid ? (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium p-2 bg-danger-soft rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>{priceError ? "Не удалось рассчитать цену." : "Невозможно выдать: резерв уже закончился."}</span>
                </div>
            ) : (
                <div className="text-xs text-foreground space-y-1.5 border-t pt-2">
                    <div className="flex justify-between">
                        <span>Период резерва:</span>
                        <span className="font-medium">{new Date(reservation.start_date).toLocaleDateString()} - {new Date(reservation.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Стоимость резерва:</span>
                        <span className="font-medium"><MoneyText value={reservation.total_cost} /></span>
                    </div>
                    <hr className="border-dashed my-1"/>
                    <div className="flex justify-between">
                        <span>Новый период аренды:</span>
                        <span className="font-medium">{newStartDate?.toLocaleDateString()} - {newEndDate?.toLocaleDateString()}</span>
                    </div>
                    {priceDetails && (priceDetails.discount_amount > 0) && (() => {
                        const totalDiscountPercentage = (priceDetails.duration_discount_percentage || 0) + (priceDetails.promo_discount_percentage || 0);
                        return (
                            <div className="flex justify-between items-center text-success">
                                <span className="flex items-center gap-1.5">
                                    <span>Скидка ({totalDiscountPercentage.toFixed(0)}%):</span>
                                    {reservation.promo_code && (priceDetails.promo_discount_percentage > 0) && (
                                        <span className="text-[11px] bg-success-soft text-success px-1.5 py-0.5 rounded font-mono font-medium">
                                            {reservation.promo_code}
                                        </span>
                                    )}
                                </span>
                                <span className="font-medium">- <MoneyText value={priceDetails.discount_amount} /></span>
                            </div>
                        );
                    })()}
                    {reservation.promo_code && priceDetails && (priceDetails.promo_discount_percentage ?? 0) === 0 && (
                        <div className="flex justify-between items-center text-warning text-xs bg-warning-soft px-2 py-1 rounded">
                            <span>Промокод {reservation.promo_code} не применен:</span>
                            <span className="font-medium">{priceDetails.promo_code_message || "условия не выполнены"}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1 border-t mt-1">
                        <span>Итого к списанию с баланса:</span>
                        <span className="text-primary"><MoneyText value={finalCost} /></span>
                    </div>
                </div>
            )}
        </div>
    );
}