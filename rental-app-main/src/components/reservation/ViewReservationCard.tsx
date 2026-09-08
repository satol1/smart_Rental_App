// src/components/reservation/ViewReservationCard.tsx

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/shared/StatusBadge";
import { CalendarRange, Edit2, RotateCcw, Trash2, ExternalLink, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDateEuropean } from "@/lib/utils";
import { daysUntilDate } from "@/utils/dates";
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import { useCurrentUser } from "@/hooks/useProfile";
import {
    canUserEditReservation,
    canUserCancelReservation,
    mapLegacyUserStatus,
    EDIT_RESTRICTION_DAYS,
    isInReservationGracePeriod,
    remainingGraceHours,
} from "@/constants/userStatusConstants";
import type { Reservation, AccessoryLink } from "@/types/reservation";
import type { Equipment } from "@/types/equipment";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";
import FinancialInfoBlock from "@/components/shared/FinancialInfoBlock";
import { STATUS_CONFIG } from "@/constants/statusConstants";
import { ContactDialog } from "@/components/shared/ContactDialog";
import { USER_ROLES } from "@/constants/userConstants";

interface ViewReservationCardProps {
    id: number;
    equipment: Equipment[];
    start_date: string;
    end_date: string;
    status: Reservation['status'];
    onEdit?: () => void;
    onCancel?: () => void;
    onRemoveItem?: (equipmentId: number) => void;
    onRepeat?: () => void;
    cancelDisabled?: boolean;
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    rental_id?: number | null;
    accessory_links?: AccessoryLink[];
    created_at?: string | null;
}

const ViewReservationCardComponent = (props: ViewReservationCardProps) => {
    const {
        id,
        equipment,
        start_date,
        end_date,
        status,
        onEdit,
        onCancel,
        onRemoveItem,
        onRepeat,
        cancelDisabled,
        total_cost,
        discount_amount,
        promo_code,
        rental_id,
        accessory_links,
        created_at,
    } = props;

    const navigate = useNavigate();
    const [isContactDialogOpen, setContactDialogOpen] = useState(false);
    const { isNewReservation } = useHighlightLogic();
    const { data: currentUser } = useCurrentUser();

    const start = start_date ? new Date(start_date) : null;
    const end = end_date ? new Date(end_date) : null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const isPast = !!end && end < now;

    // Единая нормализованная формула дней (см. utils/dates) — синхронна с бэкендом
    const daysUntilStart = start ? daysUntilDate(start) : null;
    const daysUntilEnd = end ? daysUntilDate(end) : null;

    const isActionable = status === 'active';
    const inGrace = isActionable && isInReservationGracePeriod(created_at);
    const graceHoursLeft = inGrace ? remainingGraceHours(created_at) : 0;

    // Проверяем, является ли пользователь админом или менеджером
    const isAdminOrManager = useMemo(() => {
        return currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.MANAGER;
    }, [currentUser?.role]);

    const userStatus = useMemo(() => mapLegacyUserStatus(currentUser?.status), [currentUser?.status]);

    // Права на редактирование/отмену — зеркало бэкенда (статус + дни + grace-период)
    const canEdit = useMemo(() => {
        if (isAdminOrManager) return true;
        if (!isActionable || daysUntilStart === null) return false;
        if (!userStatus) return false;
        return canUserEditReservation(userStatus, daysUntilStart, created_at);
    }, [isAdminOrManager, isActionable, userStatus, daysUntilStart, created_at]);

    const canCancel = useMemo(() => {
        if (isAdminOrManager) return true;
        if (!isActionable || daysUntilStart === null) return false;
        if (!userStatus) return false;
        return canUserCancelReservation(userStatus, daysUntilStart, created_at);
    }, [isAdminOrManager, isActionable, userStatus, daysUntilStart, created_at]);

    // Резерв защищен только если пользователь не может ни редактировать, ни отменить
    const isProtected = !canEdit && !canCancel;
    const canBeRepeated = status === 'fulfilled' || status === 'cancelled';
    const cardColor = STATUS_CONFIG[status]?.badgeClass || "bg-white hover:shadow-md";

    const getStatusInfo = () => {
        if (isPast) {
            return {
                showMessage: false,
                message: "",
                className: ""
            };
        }

        if (daysUntilStart !== null) {
            if (daysUntilStart <= 0) {
                return {
                    showMessage: true,
                    message: "Резерв уже начался",
                    className: "text-green-600"
                };
            } else if (daysUntilStart <= 3) {
                return {
                    showMessage: true,
                    message: `До начала резерва: ${daysUntilStart} дн.`,
                    className: "text-orange-600 font-medium"
                };
            } else {
                return {
                    showMessage: true,
                    message: `До начала резерва: ${daysUntilStart} дн.`,
                    className: "text-gray-600"
                };
            }
        }

        return {
            showMessage: false,
            message: "",
            className: ""
        };
    };

    const statusInfo = getStatusInfo();

    // Понятное объяснение, почему действие недоступно (Booking-паттерн: причина + срок + альтернатива)
    const restrictionHint = useMemo(() => {
        if (!isProtected || !userStatus || daysUntilStart === null) return null;
        const restrictionDays = EDIT_RESTRICTION_DAYS[userStatus];
        if (restrictionDays === 999) {
            return "Редактирование и отмена резервов для вашего статуса доступны только через менеджера.";
        }
        const needDays = restrictionDays + 1;
        return (
            `Начало через ${daysUntilStart} дн. При статусе «${userStatus}» самостоятельно ` +
            `отменить/изменить резерв можно не позднее чем за ${needDays} дн. до начала. ` +
            `Бесплатная отмена в течение 24 часов после создания уже не доступна.`
        );
    }, [isProtected, userStatus, daysUntilStart]);

    const contactContextMessage = useMemo(() => (
        `Здравствуйте! Прошу помочь по резерву #${id} (${formatDateEuropean(new Date(start_date))} — ${formatDateEuropean(new Date(end_date))}).`
    ), [id, start_date, end_date]);

    const handleRentalClick = useCallback(() => {
        if (rental_id) {
            navigate("/reservations/my", {
                state: {
                    highlightRentalId: rental_id,
                    from: "reservation"
                }
            });
        }
    }, [rental_id, navigate]);

    return (
        <>
            <Card className={`w-full px-5 py-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${cardColor}`}>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="text-base font-semibold text-sky-700 flex items-center gap-2">
                            <span
                                className={`${onEdit && status === 'active' ? 'cursor-pointer hover:text-sky-800 hover:underline transition-colors' : ''}`}
                                onClick={onEdit && status === 'active' ? onEdit : undefined}
                            >
                                Резерв #{id}
                            </span>
                            {/* Бейдж "Новый" при подсветке нового резерва */}
                            {isNewReservation(id) && (
                                <span className="px-2 py-0.5 text-[11px] rounded-md bg-violet-100 text-violet-700 border border-violet-200">Новый</span>
                            )}
                            {/* Grace-период: отменить можно, даже если дата близко */}
                            {inGrace && isActionable && !isAdminOrManager && daysUntilStart !== null && daysUntilStart <= 2 && (
                                <span className="px-2 py-0.5 text-[11px] rounded-md bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Отмена бесплатно ещё {graceHoursLeft} ч
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={status} />
                            {rental_id && status === 'fulfilled' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRentalClick}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Аренда #{rental_id}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t border-dashed">
                        {start && end ? (
                            <div className="flex items-center gap-2 text-sm">
                                <CalendarRange className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span>{formatDateEuropean(start)} — {formatDateEuropean(end)}</span>
                            </div>
                        ) : (
                            <p className="text-red-600 text-sm">Ошибка в дате резерва</p>
                        )}

                        <FinancialInfoBlock
                            totalCost={total_cost}
                            discountAmount={discount_amount}
                            promoCode={promo_code}
                            variant="default"
                            className="justify-start sm:justify-end"
                        />
                    </div>

                    {statusInfo.showMessage && status === 'active' && (
                        <div className="flex items-center gap-2 text-sm">
                            <div className={`px-2 py-1 rounded-md text-xs ${statusInfo.className} bg-opacity-10`}>
                                {statusInfo.message}
                            </div>
                        </div>
                    )}

                    {/* Состав резерва */}
                    <EquipmentWithAccessoriesList
                        equipment={equipment}
                        accessoryLinks={accessory_links || []}
                        title="Состав резерва:"
                        showTitle={true}
                        className="pt-2 border-t"
                        showRemoveButton={isActionable && !!onRemoveItem}
                        onRemoveItem={onRemoveItem}
                        isRemoveDisabled={isProtected}
                        removeButtonTitle={isProtected ? "Удаление через менеджера" : "Удалить из резерва"}
                    />

                    {canBeRepeated && onRepeat ? (
                        <div className="flex justify-end pt-2 border-t border-gray-200">
                            <Button variant="outline" size="sm" onClick={onRepeat}>
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Повторить резерв
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-gray-200">
                            {isProtected ? (
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm font-medium text-rose-700">
                                        Отмена и редактирование только через менеджера
                                    </p>
                                    {restrictionHint && (
                                        <p className="text-xs text-gray-600 max-w-md">{restrictionHint}</p>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setContactDialogOpen(true)}
                                    >
                                        Написать менеджеру
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-600">
                                    {daysUntilEnd !== null && daysUntilEnd >= 0 && (
                                        <span>До окончания: {daysUntilEnd} дн.</span>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 justify-end w-full sm:w-auto">
                                {isActionable && onEdit && canEdit && (
                                    <Button variant="secondary" size="sm" onClick={onEdit}>
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Редактировать
                                    </Button>
                                )}
                                {isActionable && onCancel && canCancel && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={cancelDisabled}
                                        onClick={onCancel}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        {cancelDisabled ? "Отмена..." : "Отменить"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            <ContactDialog
                open={isContactDialogOpen}
                onOpenChange={setContactDialogOpen}
                contextMessage={contactContextMessage}
            />
        </>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(ViewReservationCardComponent);
