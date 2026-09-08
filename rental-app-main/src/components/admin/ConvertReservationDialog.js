import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/admin/ConvertReservationDialog.tsx
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConvertReservationToRental } from "@/hooks/useAdminRentals";
import ReservationFinancialSummary from "./ReservationFinancialSummary";
import OrderFinalizationSummary from "@/components/shared/OrderFinalizationSummary";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
// +++ 1. ИМПОРТИРУЕМ ДИАЛОГ ПОДТВЕРЖДЕНИЯ И ТИП ОШИБКИ +++
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
export default function ConvertReservationDialog({ reservation, open, onClose, equipmentMap }) {
    const form = useForm({
        defaultValues: {
            deposit_amount: 0,
            prepayment_amount: 0,
            notes_on_issue: ""
        }
    });
    const convertMutation = useConvertReservationToRental();
    // +++ 2. ДОБАВЛЯЕМ СОСТОЯНИЕ ДЛЯ УПРАВЛЕНИЯ КОНФЛИКТОМ ВЫХОДНОГО ДНЯ +++
    const [holidayConflict, setHolidayConflict] = useState(null);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const { newStartDate, newEndDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!reservation)
            return { newStartDate: today, newEndDate: today };
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
    const handleSubmit = async (force = false) => {
        if (!reservation)
            return;
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
        }
        catch (error) {
            // Типизируем ошибку для доступа к деталям
            const axiosError = error;
            const detail = axiosError.response?.data?.detail;
            // Проверяем, что это именно ошибка конфликта выходного дня
            if (axiosError.response?.status === 409 && detail?.error_type === "ISSUE_ON_HOLIDAY") {
                setHolidayConflict(detail.message || "Подтвердите действие.");
            }
            else {
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
    if (!reservation)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-lg", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: ["\u0412\u044B\u0434\u0430\u0447\u0430 \u0430\u0440\u0435\u043D\u0434\u044B \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 #", reservation.id] }), _jsxs(DialogDescription, { children: ["\u0414\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430: ", _jsx("strong", { children: reservation.user_info.full_name })] })] }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsx(ReservationFinancialSummary, { reservation: reservation, open: open, hasConflicts: hasConflicts, conflictingItemIds: conflictingItemIds, isCheckingAvailability: isCheckingAvailability, equipmentMap: equipmentMap }), _jsx(OrderFinalizationSummary, { form: form, finalCost: reservation.total_cost || 0, discountAmount: 0, discountPercentage: 0 })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { onClick: () => handleSubmit(false), disabled: convertMutation.isPending || isCheckingAvailability || hasConflicts, children: convertMutation.isPending ? "Обработка..." : "Подтвердить и выдать" })] })] }) }), _jsx(ConfirmationDialog, { open: !!holidayConflict, onOpenChange: () => setHolidayConflict(null), title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432\u044B\u0434\u0430\u0447\u0438", description: holidayConflict || "", confirmText: "\u0414\u0430, \u0432\u044B\u0434\u0430\u0442\u044C", cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430", onConfirm: handleForceSubmit, variant: "destructive" })] }));
}
