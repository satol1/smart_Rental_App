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
import type { UseFormReturn } from 'react-hook-form';
import type { UserOut } from '@/types/user';
import type { Equipment } from '@/types/equipment';
import type { AvailabilityInfo } from '@/types/availability';
import type { CreateReservationFormData } from '@/hooks/admin/create-reservation/useCreateReservationForm';

// Интерфейс для props компонента
interface CreateReservationStep1DetailsProps {
    form: UseFormReturn<CreateReservationFormData>;
    users: UserOut[];
    isLoadingUsers: boolean;
    equipmentSearch: string;
    setEquipmentSearch: (query: string) => void;
    isLoadingEquipment: boolean;
    filteredAndGroupedEquipment: { tree: Record<string, Record<string, Equipment[]>>, visibleIds: number[] };
    availabilityMap: Record<number, AvailabilityInfo>;
}

export const CreateReservationStep1Details = ({
    form,
    users,
    isLoadingUsers,
    equipmentSearch,
    setEquipmentSearch,
    isLoadingEquipment,
    filteredAndGroupedEquipment,
    availabilityMap
}: CreateReservationStep1DetailsProps) => {
    const { control, formState: { errors }, watch } = form;
    
    // Состояние для диалога подтверждения выходных
    const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
    const [holidayDialogData, setHolidayDialogData] = useState<{
        message: string;
        suggestedDate: string;
        onConfirm: () => void;
    } | null>(null);

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
        if (!selectedUser || !activeReservationsData) return 0;
        
        const allReservations = activeReservationsData.pages.flatMap(page => page.items);
        return allReservations.filter(reservation => reservation.user_info.id === selectedUser.id).length;
    }, [selectedUser, activeReservationsData]);

    // Получаем лимит резервов для статуса пользователя
    const maxReservations = useMemo(() => {
        if (!selectedUser?.status) return 0;
        
        // Проверяем, что статус является валидным UserStatus
        const userStatus = Object.values(USER_STATUS).includes(selectedUser.status as typeof USER_STATUS[keyof typeof USER_STATUS]) 
            ? (selectedUser.status as typeof USER_STATUS[keyof typeof USER_STATUS]) 
            : null;
        
        return getMaxReservationsForStatus(userStatus);
    }, [selectedUser?.status]);

    // Проверяем, достигнут ли лимит
    const isLimitReached = useMemo(() => {
        if (!selectedUser || maxReservations === 0) return false;
        return activeReservationsCount >= maxReservations;
    }, [selectedUser, activeReservationsCount, maxReservations]);

    // Преобразуем строки в Date объекты для валидации
    const startDate = useMemo(() => watchedStartDate ? new Date(watchedStartDate) : new Date(), [watchedStartDate]);
    const endDate = useMemo(() => watchedEndDate ? new Date(watchedEndDate) : new Date(), [watchedEndDate]);

    // Валидация выходных
    const { startDateError, endDateError, holidays } = useHolidayValidation(startDate, endDate);

    // Обработчик для автоматической коррекции даты окончания
    const handleEndDateChange = (newEndDate: string) => {
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
        } else {
            form.setValue("end_date", newEndDate, { shouldValidate: true });
        }
    };

    // Преобразуем groupedEquipment в плоский массив для EquipmentSelector
    const allEquipment = useMemo(() => {
        const equipment: Equipment[] = [];
        Object.values(filteredAndGroupedEquipment.tree).forEach(typeGroup => {
            Object.values(typeGroup).forEach(brandGroup => {
                equipment.push(...brandGroup);
            });
        });
        return equipment;
    }, [filteredAndGroupedEquipment.tree]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <UserSelector
                        name="user_id"
                        control={control}
                        label="Пользователь *"
                        users={users || []}
                        isLoading={isLoadingUsers}
                        error={errors.user_id?.message}
                    />
                    {isPersonaNonGrata && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Для пользователя со статусом "Персона НонГрата" нельзя создавать резервы и выдавать в аренду.
                            </AlertDescription>
                        </Alert>
                    )}
                    {isBlocked && !isPersonaNonGrata && (
                        <Alert variant="default" className="border-warning/30 bg-warning-soft">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <AlertDescription className="text-warning">
                                Пользователь заблокирован. Резерв может создать только менеджер.
                            </AlertDescription>
                        </Alert>
                    )}
                    {selectedUser && !isPersonaNonGrata && !isBlocked && maxReservations > 0 && (
                        <Alert variant={isLimitReached ? "destructive" : "default"} className={isLimitReached ? "" : "border-primary/25 bg-info-soft"}>
                            {isLimitReached ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                            ) : (
                                <Info className="h-4 w-4 text-primary" />
                            )}
                            <AlertDescription className={isLimitReached ? "text-destructive" : "text-primary"}>
                                {isLimitReached ? (
                                    <>
                                        Лимит активных резервов достигнут ({activeReservationsCount}/{maxReservations}). 
                                        Менеджер может создать резерв, но это превысит лимит для статуса "{selectedUser.status}".
                                    </>
                                ) : (
                                    <>
                                        Активных резервов: {activeReservationsCount}/{maxReservations} 
                                        (статус: "{selectedUser.status}")
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <SimpleDatePickerField
                        name="start_date"
                        control={control}
                        label="Начало *"
                        minDate={new Date()}
                        error={errors.start_date?.message}
                        holidayError={startDateError}
                    />
                    
                    <SimpleDatePickerField
                        name="end_date"
                        control={control}
                        label="Окончание *"
                        minDate={watchedStartDate ? new Date(watchedStartDate) : new Date()}
                        error={errors.end_date?.message}
                        holidayError={endDateError}
                        onChange={handleEndDateChange}
                    />
                </div>
            </div>

            <EquipmentSelector
                name="equipment_ids"
                control={control}
                label="Оборудование *"
                equipment={allEquipment}
                availabilityMap={availabilityMap}
                isLoading={isLoadingEquipment}
                searchQuery={equipmentSearch}
                onSearchChange={setEquipmentSearch}
                error={errors.equipment_ids?.message}
            />

            {/* Диалог подтверждения выходных */}
            {holidayDialogData && (
                <HolidayConfirmationDialog
                    open={holidayDialogOpen}
                    message={holidayDialogData.message}
                    suggestedDate={holidayDialogData.suggestedDate}
                    onConfirm={holidayDialogData.onConfirm}
                    onCancel={() => setHolidayDialogOpen(false)}
                    isConfirming={false}
                />
            )}
        </div>
    );
};