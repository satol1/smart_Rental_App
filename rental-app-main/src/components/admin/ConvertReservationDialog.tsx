// path: rental-app-main/src/components/admin/ConvertReservationDialog.tsx

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConvertReservationToRental } from "@/hooks/useAdminRentals";
import type { AdminReservationOut } from "@/types/reservation";
import type { Equipment } from "@/types/equipment";
import ReservationFinancialSummary from "./ReservationFinancialSummary";
import OrderFinalizationSummary from "@/components/shared/OrderFinalizationSummary";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { usePriceCalculator } from "@/hooks/reservation/usePriceCalculator";
// +++ 1. ИМПОРТИРУЕМ ДИАЛОГ ПОДТВЕРЖДЕНИЯ И ТИП ОШИБКИ +++
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { AxiosError } from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatDateEuropean } from "@/lib/utils";
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

interface Props {
    reservation: AdminReservationOut | null;
    open: boolean;
    onClose: () => void;
    equipmentMap: Map<number, Equipment>;
}

export default function ConvertReservationDialog({ reservation, open, onClose, equipmentMap }: Props) {
    const form = useForm({
        defaultValues: {
            deposit_amount: 0,
            prepayment_amount: 0,
            notes_on_issue: ""
        }
    });
    
    const convertMutation = useConvertReservationToRental();

    // +++ 2. ДОБАВЛЯЕМ СОСТОЯНИЕ ДЛЯ УПРАВЛЕНИЯ КОНФЛИКТОМ ВЫХОДНОГО ДНЯ +++
    const [holidayConflict, setHolidayConflict] = useState<string | null>(null);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const [dateMode, setDateMode] = useState<"today" | "contract">("today");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");

    useEffect(() => {
        if (reservation) {
            const todayStr = formatDate(new Date());
            // Если дата брони сегодня, режим 'today', иначе по умолчанию 'today' с возможностью переключить на 'contract'
            setDateMode("today");
            setCustomStartDate(todayStr);
            setCustomEndDate(reservation.end_date);
        }
    }, [reservation, open]);

    const handleModeChange = (mode: "today" | "contract") => {
        if (!reservation) return;
        setDateMode(mode);
        if (mode === "today") {
            setCustomStartDate(formatDate(new Date()));
            setCustomEndDate(reservation.end_date);
        } else {
            setCustomStartDate(reservation.start_date);
            setCustomEndDate(reservation.end_date);
        }
    };

    const { newStartDate, newEndDate, isExpired, isValidRange } = useMemo(() => {
        if (!reservation || !customStartDate || !customEndDate) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return { newStartDate: now, newEndDate: now, isExpired: false, isValidRange: false };
        }
        const sDate = new Date(customStartDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(customEndDate);
        eDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            newStartDate: sDate,
            newEndDate: eDate,
            isExpired: eDate < today,
            isValidRange: eDate >= sDate,
        };
    }, [reservation, customStartDate, customEndDate]);

    const {
        data: priceDetails,
        isFetching: isCalculatingPrice,
        error: priceError
    } = usePriceCalculator({
        equipmentIds: reservation?.equipment_ids || [],
        startDate: newStartDate,
        endDate: newEndDate,
        selectedAccessories: reservation?.selected_accessories || {},
        promoCode: reservation?.promo_code || undefined,
        enabled: open && isValidRange && !isExpired && !!reservation,
    });

    const finalCost = priceDetails?.final_total ?? reservation?.total_cost ?? 0;
    const discountAmount = priceDetails?.discount_amount ?? 0;
    const totalDiscountPercentage = (priceDetails?.duration_discount_percentage || 0) + (priceDetails?.promo_discount_percentage || 0);

    const { hasConflicts, conflictingItemIds, isLoading: isCheckingAvailability } = useAvailabilityCheck({
        equipmentIds: reservation?.equipment_ids || [],
        startDate: newStartDate,
        endDate: newEndDate,
        excludeReservationId: reservation?.id,
    });

    useEffect(() => {
        if (!open) {
            form.reset({
                deposit_amount: 0,
                prepayment_amount: 0,
                notes_on_issue: ""
            });
            // +++ 3. СБРАСЫВАЕМ СОСТОЯНИЕ КОНФЛИКТА ПРИ ЗАКРЫТИИ +++
            setHolidayConflict(null);
            // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        }
    }, [open, form]);

    // +++ 4. ОБНОВЛЯЕМ ЛОГИКУ ОБРАБОТКИ ОТПРАВКИ ФОРМЫ +++
    const handleSubmit = async (force: boolean = false) => {
        if (!reservation) return;

        const formData = form.getValues();
        
        try {
            await convertMutation.mutateAsync({
                reservationId: reservation.id,
                data: {
                    start_date: customStartDate,
                    end_date: customEndDate,
                    notes_on_issue: formData.notes_on_issue,
                    deposit_amount: formData.deposit_amount || 0,
                    prepayment_amount: formData.prepayment_amount || 0,
                    force_issue_on_holiday: force, // Передаем флаг `force`
                },
            });
            onClose();
        } catch (error) {
            // Типизируем ошибку для доступа к деталям
            const axiosError = error as AxiosError<{ detail?: { error_type?: string; message?: string } }>;
            const detail = axiosError.response?.data?.detail;

            // Проверяем, что это именно ошибка конфликта выходного дня
            if (axiosError.response?.status === 409 && detail?.error_type === "ISSUE_ON_HOLIDAY") {
                setHolidayConflict(detail.message || "Подтвердите действие.");
            } else {
                // Для других ошибок показываем общее сообщение
                console.error("Ошибка при конвертации резерва:", error);
                // Другие ошибки будут обработаны в хуке useConvertReservationToRental
            }
        }
    };

    // +++ 5. ДОБАВЛЯЕМ ОБРАБОТЧИК ДЛЯ ФОРСИРОВАННОЙ ОТПРАВКИ +++
    const handleForceSubmit = () => {
        setHolidayConflict(null); // Закрываем диалог подтверждения
        void handleSubmit(true); // Повторно отправляем с флагом force = true
    };
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    if (!reservation) return null;

    const isDifferentStart = reservation.start_date !== formatDate(new Date());

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Выдача аренды из резерва #{reservation.id}</DialogTitle>
                        <DialogDescription>
                            Для клиента: <strong>{reservation.user_info.full_name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Блок выбора дат выдачи */}
                        <div className="p-3 bg-muted/50 border rounded-lg space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Сроки аренды при выдаче
                            </Label>

                            {isDifferentStart && (
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={dateMode === "today" ? "default" : "outline"}
                                        className="text-xs flex-1 h-8"
                                        onClick={() => handleModeChange("today")}
                                    >
                                        Выдать сегодня
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={dateMode === "contract" ? "default" : "outline"}
                                        className="text-xs flex-1 h-8"
                                        onClick={() => handleModeChange("contract")}
                                    >
                                        Даты брони ({formatDateEuropean(reservation.start_date)})
                                    </Button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="space-y-1">
                                    <Label htmlFor="issue-start-date" className="text-xs">Начало</Label>
                                    <Input
                                        id="issue-start-date"
                                        type="date"
                                        className="h-8 text-xs"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="issue-end-date" className="text-xs">Окончание</Label>
                                    <Input
                                        id="issue-end-date"
                                        type="date"
                                        className="h-8 text-xs"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            {!isValidRange && (
                                <p className="text-xs text-destructive">
                                    Дата окончания должна быть не раньше даты начала.
                                </p>
                            )}
                        </div>

                        <ReservationFinancialSummary
                            reservation={reservation}
                            open={open}
                            hasConflicts={hasConflicts}
                            conflictingItemIds={conflictingItemIds}
                            isCheckingAvailability={isCheckingAvailability}
                            equipmentMap={equipmentMap}
                            priceDetails={priceDetails}
                            isCalculatingPrice={isCalculatingPrice}
                            priceError={priceError}
                            startDate={newStartDate}
                            endDate={newEndDate}
                        />

                        <OrderFinalizationSummary
                            form={form}
                            finalCost={finalCost}
                            discountAmount={discountAmount}
                            discountPercentage={totalDiscountPercentage}
                            hideSummary={true}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button
                            onClick={() => handleSubmit(false)}
                            disabled={convertMutation.isPending || isCheckingAvailability || hasConflicts || isCalculatingPrice || isExpired || !isValidRange}
                        >
                            {convertMutation.isPending ? "Обработка..." : "Подтвердить и выдать"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* +++ 6. ДОБАВЛЯЕМ ДИАЛОГ ПОДТВЕРЖДЕНИЯ +++ */}
            <ConfirmationDialog
                open={!!holidayConflict}
                onOpenChange={() => setHolidayConflict(null)}
                title="Подтверждение выдачи"
                description={holidayConflict || ""}
                confirmText="Да, выдать"
                cancelText="Отмена"
                onConfirm={handleForceSubmit}
                variant="destructive"
            />
            {/* +++++++++++++++++++++++++++++++++++++++ */}
        </>
    );
}