// src/components/reservation/EditableReservationCard.tsx

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Save, X, AlertTriangle, Info } from "lucide-react";
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
    const { t } = useTranslation();
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
            <Card className="w-full px-5 py-5 rounded-2xl border border-primary/30 bg-card shadow-none">
                <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="text-base font-semibold text-primary">
                                {t('ordersDesign.editing', { id: reservationId })}
                            </div>
                            {isCheckingAvailability && (
                                <div className="flex items-center gap-1 text-xs text-primary">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Проверка доступности...
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-info-soft text-primary border-primary/20">
                                Редактирование
                            </Badge>
                            {displayNewItemsCount > 0 && (
                                <Badge variant="outline" className="bg-success-soft text-success border-success/20">
                                    <Plus className="w-3 h-3 mr-1" />
                                    +{displayNewItemsCount} новых
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            {editRestrictionMessage && (
                                <Alert variant="default" className="border-warning/20 bg-warning-soft">
                                    <Info className="h-4 w-4 text-warning" />
                                    <AlertDescription className="text-warning">
                                        {editRestrictionMessage}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {hasConflicts && (
                                <div className="flex items-start gap-2 p-3 bg-danger-soft border border-destructive/20 rounded-md">
                                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-destructive">
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
                                <div className="flex flex-wrap justify-between items-center gap-3">
                                    <div className="text-sm font-medium text-foreground">
                                        Оборудование ({totalItemsInEdit} поз.
                                        {displayNewItemsCount > 0 && (
                                            <span className="text-success">
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
                                    <div className="text-sm text-muted-foreground text-center py-6 border border-border rounded-md">
                                        Нет оборудования в резерве.{" "}
                                        <button
                                            onClick={onAddEquipment}
                                            disabled={isLoading}
                                            className="text-primary hover:underline"
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
                                promoCodeValid={financials.promoCodeValid}
                                isLoading={isCheckingAvailability}
                                hasConflicts={hasConflicts}
                                variant="inline"
                                showActions={false}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-primary/20 mt-4">
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

                    <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">{t('ordersDesign.editHelp')}</p>
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
