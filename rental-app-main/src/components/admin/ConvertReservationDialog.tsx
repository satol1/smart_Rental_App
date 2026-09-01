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
// +++ 1. ИМПОРТИРУЕМ ДИАЛОГ ПОДТВЕРЖДЕНИЯ И ТИП ОШИБКИ +++
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { AxiosError } from "axios";
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

    const { newStartDate, newEndDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!reservation) return { newStartDate: today, newEndDate: today };
        const originalEndDate = new Date(reservation.end_date);
        
        // Если дата окончания резерва уже прошла или наступает сегодня, 
        // устанавливаем дату окончания на завтра
        const finalEndDate = originalEndDate <= today 
            ? new Date(today.getTime() + 24 * 60 * 60 * 1000) // завтра
            : originalEndDate;
            
        return { newStartDate: today, newEndDate: finalEndDate };
    }, [reservation]);

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
                        <ReservationFinancialSummary
                            reservation={reservation}
                            open={open}
                            hasConflicts={hasConflicts}
                            conflictingItemIds={conflictingItemIds}
                            isCheckingAvailability={isCheckingAvailability}
                            equipmentMap={equipmentMap}
                        />

                        <OrderFinalizationSummary
                            form={form as any}
                            finalCost={reservation.total_cost || 0}
                            discountAmount={0}
                            discountPercentage={0}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button onClick={() => handleSubmit(false)} disabled={convertMutation.isPending || isCheckingAvailability || hasConflicts}>
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