import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/CreateReservationStep1Details.tsx
import { useState, useMemo } from "react";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import HolidayConfirmationDialog from "@/components/reservation/HolidayConfirmationDialog";
import SimpleDatePickerField from "@/components/shared/SimpleDatePickerField";
import UserSelector from "@/components/shared/UserSelector";
import EquipmentSelector from "@/components/shared/EquipmentSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { USER_STATUS, getMaxReservationsForStatus } from "@/constants/userStatusConstants";
import { UserService } from "@/core/services";
import { useAdminReservations } from "@/hooks/useAdminReservations";
export const CreateReservationStep1Details = ({ form, users, isLoadingUsers, equipmentSearch, setEquipmentSearch, isLoadingEquipment, filteredAndGroupedEquipment, availabilityMap }) => {
    const { control, formState: { errors }, watch } = form;
    // Состояние для диалога подтверждения выходных
    const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
    const [holidayDialogData, setHolidayDialogData] = useState(null);
    // Получаем значения дат из формы
    const watchedStartDate = watch("start_date");
    const watchedEndDate = watch("end_date");
    const watchedUserId = watch("user_id");
    // Получаем выбранного пользователя для проверки статуса
    const selectedUser = useMemo(() => {
        return watchedUserId ? users.find(u => u.id === watchedUserId) : null;
    }, [watchedUserId, users]);
    // Проверка статуса выбранного пользователя
    const isPersonaNonGrata = selectedUser ? UserService.isPersonaNonGrata(selectedUser) : false;
    const isBlocked = selectedUser ? UserService.isBlocked(selectedUser) : false;
    // Получаем активные резервы для проверки лимита
    const { data: activeReservationsData } = useAdminReservations({
        status: "active",
        limit: 1000, // Большой лимит для получения всех активных резервов
    });
    // Подсчитываем активные резервы выбранного пользователя
    const activeReservationsCount = useMemo(() => {
        if (!selectedUser || !activeReservationsData)
            return 0;
        const allReservations = activeReservationsData.pages.flatMap(page => page.items);
        return allReservations.filter(reservation => reservation.user_info.id === selectedUser.id).length;
    }, [selectedUser, activeReservationsData]);
    // Получаем лимит резервов для статуса пользователя
    const maxReservations = useMemo(() => {
        if (!selectedUser?.status)
            return 0;
        // Проверяем, что статус является валидным UserStatus
        const userStatus = Object.values(USER_STATUS).includes(selectedUser.status)
            ? selectedUser.status
            : null;
        return getMaxReservationsForStatus(userStatus);
    }, [selectedUser?.status]);
    // Проверяем, достигнут ли лимит
    const isLimitReached = useMemo(() => {
        if (!selectedUser || maxReservations === 0)
            return false;
        return activeReservationsCount >= maxReservations;
    }, [selectedUser, activeReservationsCount, maxReservations]);
    // Преобразуем строки в Date объекты для валидации
    const startDate = useMemo(() => watchedStartDate ? new Date(watchedStartDate) : new Date(), [watchedStartDate]);
    const endDate = useMemo(() => watchedEndDate ? new Date(watchedEndDate) : new Date(), [watchedEndDate]);
    // Валидация выходных
    const { startDateError, endDateError, holidays } = useHolidayValidation(startDate, endDate);
    // Обработчик для автоматической коррекции даты окончания
    const handleEndDateChange = (newEndDate) => {
        const endDateObj = new Date(newEndDate);
        if (holidays.some(holiday => holiday.getTime() === endDateObj.getTime())) {
            // Находим следующий рабочий день
            const nextDay = new Date(endDateObj);
            nextDay.setDate(nextDay.getDate() + 1);
            setHolidayDialogData({
                message: `Дата окончания "${newEndDate}" выпадает на выходной день.`,
                suggestedDate: nextDay.toISOString().split('T')[0],
                onConfirm: () => {
                    form.setValue("end_date", nextDay.toISOString().split('T')[0], { shouldValidate: true });
                    setHolidayDialogOpen(false);
                }
            });
            setHolidayDialogOpen(true);
        }
        else {
            form.setValue("end_date", newEndDate, { shouldValidate: true });
        }
    };
    // Преобразуем groupedEquipment в плоский массив для EquipmentSelector
    const allEquipment = useMemo(() => {
        const equipment = [];
        Object.values(filteredAndGroupedEquipment.tree).forEach(typeGroup => {
            Object.values(typeGroup).forEach(brandGroup => {
                equipment.push(...brandGroup);
            });
        });
        return equipment;
    }, [filteredAndGroupedEquipment.tree]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(UserSelector, { name: "user_id", control: control, label: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C *", users: users || [], isLoading: isLoadingUsers, error: errors.user_id?.message }), isPersonaNonGrata && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "\u0414\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C \"\u041F\u0435\u0440\u0441\u043E\u043D\u0430 \u041D\u043E\u043D\u0413\u0440\u0430\u0442\u0430\" \u043D\u0435\u043B\u044C\u0437\u044F \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u044B \u0438 \u0432\u044B\u0434\u0430\u0432\u0430\u0442\u044C \u0432 \u0430\u0440\u0435\u043D\u0434\u0443." })] })), isBlocked && !isPersonaNonGrata && (_jsxs(Alert, { variant: "default", className: "border-amber-200 bg-amber-50", children: [_jsx(AlertTriangle, { className: "h-4 w-4 text-amber-600" }), _jsx(AlertDescription, { className: "text-amber-800", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D. \u0420\u0435\u0437\u0435\u0440\u0432 \u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440." })] })), selectedUser && !isPersonaNonGrata && !isBlocked && maxReservations > 0 && (_jsxs(Alert, { variant: isLimitReached ? "destructive" : "default", className: isLimitReached ? "" : "border-blue-200 bg-blue-50", children: [isLimitReached ? (_jsx(AlertTriangle, { className: "h-4 w-4 text-red-600" })) : (_jsx(Info, { className: "h-4 w-4 text-blue-600" })), _jsx(AlertDescription, { className: isLimitReached ? "text-red-800" : "text-blue-800", children: isLimitReached ? (_jsxs(_Fragment, { children: ["\u041B\u0438\u043C\u0438\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432 \u0434\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 (", activeReservationsCount, "/", maxReservations, "). \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043C\u043E\u0436\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432, \u043D\u043E \u044D\u0442\u043E \u043F\u0440\u0435\u0432\u044B\u0441\u0438\u0442 \u043B\u0438\u043C\u0438\u0442 \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \"", selectedUser.status, "\"."] })) : (_jsxs(_Fragment, { children: ["\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432: ", activeReservationsCount, "/", maxReservations, "(\u0441\u0442\u0430\u0442\u0443\u0441: \"", selectedUser.status, "\")"] })) })] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(SimpleDatePickerField, { name: "start_date", control: control, label: "\u041D\u0430\u0447\u0430\u043B\u043E *", minDate: new Date(), error: errors.start_date?.message, holidayError: startDateError }), _jsx(SimpleDatePickerField, { name: "end_date", control: control, label: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 *", minDate: watchedStartDate ? new Date(watchedStartDate) : new Date(), error: errors.end_date?.message, holidayError: endDateError, onChange: handleEndDateChange })] })] }), _jsx(EquipmentSelector, { name: "equipment_ids", control: control, label: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 *", equipment: allEquipment, availabilityMap: availabilityMap, isLoading: isLoadingEquipment, searchQuery: equipmentSearch, onSearchChange: setEquipmentSearch, error: errors.equipment_ids?.message }), holidayDialogData && (_jsx(HolidayConfirmationDialog, { open: holidayDialogOpen, message: holidayDialogData.message, suggestedDate: holidayDialogData.suggestedDate, onConfirm: holidayDialogData.onConfirm, onCancel: () => setHolidayDialogOpen(false), isConfirming: false }))] }));
};
