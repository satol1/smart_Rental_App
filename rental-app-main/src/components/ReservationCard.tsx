// src/components/ReservationCard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ReservationEditProvider } from "@/contexts/ReservationEditProvider"; // ✨ Импортируем новый провайдер
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import EditableReservationCard from "./reservation/EditableReservationCard";
import ViewReservationCard from "./reservation/ViewReservationCard";
import type { Reservation, AccessoryLink } from "@/types/reservation";
import type { EquipmentDisplayDetail } from "@/hooks/reservation/useReservationState";
import type { Equipment } from "@/types/equipment";
import { useCurrentUser } from "@/hooks/useProfile";
import { USER_ROLES } from "@/constants/userConstants";

type Props = {
    id: number;
    equipment: EquipmentDisplayDetail[];
    start_date: string;
    end_date: string;
    status: Reservation['status'];
    onRemoveItem?: (equipmentId: number) => void;
    onCancel?: () => void;
    cancelDisabled?: boolean;
    onRepeat?: () => void;
    autoStartEdit?: boolean;
    total_cost?: number;
    discount_amount?: number;
    promo_code?: string | null;
    selected_accessories?: Record<number, number[]>;
    accessory_links?: AccessoryLink[];
    rental_id?: number | null;
    fullEquipmentData?: Equipment[];
    created_at?: string | null;
};

export default function ReservationCard({
                                            id, equipment, start_date, end_date, status, onRemoveItem, onCancel,
                                            cancelDisabled, onRepeat, autoStartEdit = false,
                                            total_cost, discount_amount, promo_code, selected_accessories,
                                            accessory_links, rental_id, fullEquipmentData, created_at
                                        }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const { data: currentUser } = useCurrentUser();

    // Определяем, является ли пользователь админом или менеджером
    const isAdminOrManager = useMemo(() => {
        return currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.MANAGER;
    }, [currentUser?.role]);

    // ✨ 1. Управляем состоянием редактирования прямо здесь.
    const [isEditing, setIsEditing] = useState(autoStartEdit);
    const [hasAutoStarted, setHasAutoStarted] = useState(false);

    // Этот объект все еще нужен для передачи в провайдер.
    const reservationForProvider: Reservation = useMemo(() => ({
        id, equipment_ids: equipment.map(e => e.id), start_date, end_date, status,
        total_cost, discount_amount, promo_code,
        selected_accessories: selected_accessories || {},
        created_at,
    }), [id, equipment, start_date, end_date, status, total_cost, discount_amount, promo_code, selected_accessories, created_at]);

    useEffect(() => {
        if (autoStartEdit && !isEditing && !hasAutoStarted) {
            setIsEditing(true);
            setHasAutoStarted(true);
        }
    }, [autoStartEdit, isEditing, hasAutoStarted]);

    // 🔧 ИСПРАВЛЕНИЕ: Добавляем механизм автоматического открытия редактирования при возврате с главной страницы
    // Аналогично админской панели
    useEffect(() => {
        const state = location.state as { continueEditing?: number } | null;
        if (state?.continueEditing === id) {
            console.log("🔧 [ReservationCard] Автоматически открываем редактирование для резерва #", id);
            setIsEditing(true);
            // Очистим state, чтобы не триггерилось повторно при навигации
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, id, navigate, location.pathname]);


    // ✨ 2. Мы больше не используем хук useInlineReservationEdit напрямую здесь.
    // Вместо этого мы управляем состоянием isEditing и рендерим либо View, либо Provider+Edit.

    const { getHighlightClasses, elementRef } = useHighlightLogic({ 
        enableScrollToHighlight: true 
    });
    const highlightClasses = getHighlightClasses(id);

    return (
        <div ref={elementRef} className={`transition-all duration-300 ${highlightClasses}`}>
            {isEditing ? (
                // ✨ 3. Оборачиваем компонент редактирования в наш новый провайдер.
                <ReservationEditProvider
                    reservation={reservationForProvider}
                    initialEquipmentForDisplay={equipment}
                    onFullCancellation={onCancel}
                    isAdminContext={isAdminOrManager}
                    // ✅ УПРОЩЕННАЯ ЛОГИКА: Просто закрываем редактирование
                    onFinishEditing={() => {
                        console.log("🔧 [ReservationCard] onFinishEditing вызван для резерва #", id);
                        setIsEditing(false);
                    }}
                >
                    {/* EditableReservationCard теперь не принимает пропсов! */}
                    <EditableReservationCard />
                </ReservationEditProvider>
            ) : (
                <ViewReservationCard
                    id={id}
                    equipment={fullEquipmentData || equipment.map(eq => ({ id: eq.id, name: eq.label } as Equipment))}
                    start_date={start_date}
                    end_date={end_date}
                    status={status}
                    // ✨ 5. Кнопка "Редактировать" теперь просто переключает локальное состояние.
                    onEdit={status === 'active' ? () => setIsEditing(true) : undefined}
                    onCancel={onCancel}
                    onRemoveItem={onRemoveItem}
                    onRepeat={onRepeat}
                    cancelDisabled={cancelDisabled}
                    total_cost={total_cost}
                    discount_amount={discount_amount}
                    promo_code={promo_code}
                    accessory_links={accessory_links}
                    rental_id={rental_id}
                    created_at={created_at}
                />
            )}

            {/* Диалог подтверждения удаления остается здесь, т.к. он связан с ViewReservationCard */}
            {/* Его логика будет пересмотрена, если потребуется в режиме редактирования */}
            {/* <ConfirmItemRemovalDialog ... />  <- можно пока оставить или закомментировать */}
        </div>
    );
}