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
    // +++ НАЧАЛО: Новые пропсы для отображения конфликтов +++
    hasConflicts: boolean;
    conflictingItemIds: number[];
    isCheckingAvailability: boolean;
    equipmentMap: Map<number, Equipment>;
    // +++ КОНЕЦ: Новые пропсы +++
}

export default function ReservationFinancialSummary({
                                                        reservation,
                                                        open,
                                                        hasConflicts,
                                                        conflictingItemIds,
                                                        isCheckingAvailability,
                                                        equipmentMap
                                                    }: ReservationFinancialSummaryProps) {

    const { newStartDate, newEndDate, newDateRangeIsValid } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const originalEndDate = new Date(reservation.end_date);

        return {
            newStartDate: today,
            newEndDate: originalEndDate,
            newDateRangeIsValid: originalEndDate > today,
        };
    }, [reservation]);

    const { data: priceDetails, isFetching: isCalculatingPrice, error: priceError } = usePriceCalculator({
        equipmentIds: reservation.equipment_ids || [],
        startDate: newStartDate!,
        endDate: newEndDate!,
        selectedAccessories: reservation.selected_accessories || {},
        promoCode: reservation.promo_code || undefined,
        enabled: open && newDateRangeIsValid,
    });

    const finalCost = priceDetails?.final_total ?? reservation.total_cost ?? 0;

    // +++ Получаем имена конфликтного оборудования +++
    const conflictingEquipmentNames = useMemo(() =>
            conflictingItemIds.map(id => equipmentMap.get(id)?.name).filter(Boolean).join(', '),
        [conflictingItemIds, equipmentMap]);

    return (
        <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ReceiptText className="w-5 h-5 text-sky-600" />
                Финансовая сводка
            </h4>

            {(isCalculatingPrice || isCheckingAvailability) ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isCheckingAvailability ? "Проверка доступности..." : "Пересчет стоимости..."}
                </div>
            ) : hasConflicts ? (
                // +++ НАЧАЛО: Новый блок для отображения ошибки конфликта +++
                <div className="text-sm text-red-700 font-medium p-2 bg-red-100 border border-red-200 rounded-md space-y-1">
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
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium p-2 bg-red-50 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>{priceError ? "Не удалось рассчитать цену." : "Невозможно выдать: резерв уже закончился."}</span>
                </div>
            ) : (
                <div className="text-xs text-gray-700 space-y-1.5 border-t pt-2">
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
                            <div className="flex justify-between text-green-600">
                                <span>Скидка ({totalDiscountPercentage.toFixed(0)}%):</span>
                                <span className="font-medium">- <MoneyText value={priceDetails.discount_amount} /></span>
                            </div>
                        );
                    })()}
                    <div className="flex justify-between text-base font-bold pt-1 border-t mt-1">
                        <span>Итого к списанию с баланса:</span>
                        <span className="text-sky-700"><MoneyText value={finalCost} /></span>
                    </div>
                </div>
            )}
        </div>
    );
}