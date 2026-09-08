// src/components/reservation/EditableReservationCard.tsx

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Save, X, AlertTriangle, Sparkles, Info } from "lucide-react";
import EditableDateRange from "./EditableDateRange";
import FinancialSummaryBlock from "@/components/shared/FinancialSummaryBlock";
import EditableEquipmentItem from "./EditableEquipmentItem";
import { useReservationEditContext } from "@/contexts/ReservationEditContext";
import { useReservationNavigation } from "@/hooks/useReservationNavigation";
import HolidayConfirmationDialog from "./HolidayConfirmationDialog";
import { formatDateEuropean } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useProfile";
import { canUserEditReservation, mapLegacyUserStatus, EDIT_RESTRICTION_DAYS } from "@/constants/userStatusConstants";
import { daysUntilDate } from "@/utils/dates";

export default function EditableReservationCard() {
    const {
        reservationId,
        editState,
        availabilityMap,
        equipmentMap,
        hasConflicts,
        saveChanges,
        cancelEdit,
        updateDates,
        removeEquipmentItem,
        isLoading,
        isCheckingAvailability,
        isSaving,
        localSelectedAccessories,
        toggleAccessory,
        holidayConflict,
        confirmHolidayAdjustment,
        cancelHolidayAdjustment,
        isHolidayValid,
        priceDetails,
        financials,
        promoCode,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        isAdminContext,
        reservationCreatedAt,
    } = useReservationEditContext();

    const { data: currentUser } = useCurrentUser();
    const { goToEquipmentSelection } = useReservationNavigation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА

    const displayNewItemsCount = editState.newlyAddedEquipmentIdsAsArray.length;
    const equipmentToDisplay = editState.currentEquipmentDetails;
    const totalItemsInEdit = equipmentToDisplay.length;

    // Проверка прав на редактирование (только для обычных пользователей, не админов)
    const canEditByStatus = useMemo(() => {
        if (isAdminContext) return true; // Менеджеры всегда могут редактировать

        if (!currentUser?.status) return false;

        // Используем маппинг старых статусов для обратной совместимости
        const userStatus = mapLegacyUserStatus(currentUser.status);

        if (!userStatus) return false;

        const daysUntilStart = daysUntilDate(editState.startDate);

        return canUserEditReservation(userStatus, daysUntilStart, reservationCreatedAt);
    }, [isAdminContext, currentUser?.status, editState.startDate, reservationCreatedAt]);

    const editRestrictionMessage = useMemo(() => {
        if (isAdminContext || canEditByStatus) return null;

        const daysUntilStart = daysUntilDate(editState.startDate);
        const userStatus = mapLegacyUserStatus(currentUser?.status);

        if (daysUntilStart <= 0) {
            return "Резерв уже начался. Для редактирования обратитесь к менеджеру.";
        }

        // Порог берём по статусу пользователя, а не по числу дней
        const restrictionDays = userStatus ? EDIT_RESTRICTION_DAYS[userStatus] : 2;
        return (
            `Редактирование доступно не позднее чем за ${restrictionDays + 1} дн. до начала ` +
            `(ваш статус: «${userStatus ?? "Новый"}»). До начала ${daysUntilStart} дн. ` +
            "Для изменения резерва обратитесь к менеджеру."
        );
    }, [isAdminContext, canEditByStatus, editState.startDate, currentUser?.status]);

    const onAddEquipment = () => {
        // Централизованный переход на страницу выбора оборудования
        goToEquipmentSelection(
            {
                id: reservationId,
                start_date: editState.startDate.toISOString(),
                end_date: editState.endDate.toISOString(),
                equipment_ids: editState.currentEquipmentDetails.map(eq => eq.id),
                status: 'active',
            },
            isAdminContext
        );
    };

    return (
        <>
            <Card className="w-full px-5 py-4 rounded-2xl border shadow-md bg-blue-50 border-blue-300 transition-all">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="text-base font-semibold text-blue-700">
                                ✏️ Редактирование резерва #{reservationId}
                            </div>
                            {isCheckingAvailability && (
                                <div className="flex items-center gap-1 text-xs text-blue-600">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Проверка доступности...
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                Редактирование
                            </Badge>
                            {displayNewItemsCount > 0 && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    +{displayNewItemsCount} новых
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            {editRestrictionMessage && (
                                <Alert variant="default" className="border-amber-200 bg-amber-50">
                                    <Info className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-amber-800">
                                        {editRestrictionMessage}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {hasConflicts && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-red-700">
                                        <div className="font-medium">Обнаружены конфликты!</div>
                                        <div className="text-xs mt-1">
                                            Некоторое оборудование недоступно на выбранные даты.
                                            Пожалуйста, исправьте конфликты перед сохранением.
                                        </div>
                                    </div>
                                </div>
                            )}

                            <EditableDateRange
                                startDate={editState.startDate}
                                endDate={editState.endDate}
                                onChange={updateDates}
                                disabled={isLoading}
                            />

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium text-gray-700">
                                        Оборудование ({totalItemsInEdit} поз.
                                        {displayNewItemsCount > 0 && (
                                            <span className="text-green-600">
                                                , из них {displayNewItemsCount} новых
                                            </span>
                                        )}
                                        ):
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onAddEquipment}
                                        disabled={isLoading}
                                        className="text-xs px-3 py-1 h-7"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Добавить
                                    </Button>
                                </div>
                                {totalItemsInEdit === 0 ? (
                                    <div className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-300 rounded-md">
                                        Нет оборудования в резерве.{" "}
                                        <button
                                            onClick={onAddEquipment}
                                            disabled={isLoading}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Добавить оборудование
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {equipmentToDisplay.map((itemDetail) => {
                                            const availability = availabilityMap[itemDetail.id];
                                            const itemHasConflict = !!availability && (
                                                availability.status === "reserved" || availability.status === "rented"
                                            );
                                            const isNew = editState.newlyAddedEquipmentIdsAsArray.includes(itemDetail.id);

                                            return (
                                                <EditableEquipmentItem
                                                    key={itemDetail.id}
                                                    itemDetail={itemDetail}
                                                    fullEquipmentItem={equipmentMap.get(itemDetail.id)}
                                                    isNew={isNew}
                                                    hasConflict={itemHasConflict}
                                                    availability={availability}
                                                    selectedAccessoryIds={localSelectedAccessories[itemDetail.id] || []}
                                                    onRemove={() => removeEquipmentItem(itemDetail.id)}
                                                    onToggleAccessory={toggleAccessory}
                                                    disabled={isLoading}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <FinancialSummaryBlock
                                priceDetails={priceDetails}
                                promoCode={promoCode}
                                setPromoCode={setPromoCode}
                                applyPromoCode={applyPromoCode}
                                removePromoCode={removePromoCode}
                                promoCodeMessage={financials.promoCodeMessage}
                                isLoading={isCheckingAvailability}
                                hasConflicts={hasConflicts}
                                variant="inline"
                                showActions={false}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-blue-200 mt-4">
                        <Button
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={isLoading}
                            className="text-sm mr-auto"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Отмена
                        </Button>
                        <Button
                            onClick={() => saveChanges()}
                            disabled={!editState.hasChanges || hasConflicts || !isHolidayValid || isLoading || totalItemsInEdit === 0}
                            className="text-sm min-w-[120px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Сохранение...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Сохранить
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 space-y-1 mt-4">
                        <div>💡 Подсказки:</div>
                        <ul className="space-y-0.5 ml-3">
                            <li>• Зеленым отмечены новые позиции, добавленные при текущем редактировании.</li>
                            <li>• Желтым/красным отмечены конфликты с другими резервами.</li>
                            <li>• Нажмите "Добавить оборудование" для выбора дополнительных позиций.</li>
                            <li>• Кнопка "Сохранить" активна только при наличии изменений, отсутствии конфликтов и валидных датах.</li>
                            <li>• После сохранения новые позиции станут обычными частями резерва.</li>
                        </ul>
                    </div>
                </div>
            </Card>

            <HolidayConfirmationDialog
                open={!!holidayConflict}
                message={holidayConflict?.message || ""}
                suggestedDate={holidayConflict ? formatDateEuropean(new Date(holidayConflict.suggested_end_date)) : ""}
                onConfirm={confirmHolidayAdjustment}
                onCancel={cancelHolidayAdjustment}
                isConfirming={isSaving}
            />
        </>
    );
}