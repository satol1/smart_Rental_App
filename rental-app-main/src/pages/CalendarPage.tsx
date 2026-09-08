// path: rental-app-main/src/pages/CalendarPage.tsx

import { useState, useMemo, useCallback, useEffect } from "react";
import { useDateStore } from "@/store/dateStore";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useCalendarFilters } from "@/hooks/features/useCalendarFilters";
import CalendarFiltersBlock from "@/components/calendar/CalendarFiltersBlock";
import CalendarTable from "@/components/calendar/CalendarTable";
import CalendarEventDetailsModal, { type CalendarEventDetails } from "@/components/calendar/CalendarEventDetailsModal";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";
import { useCalendarEventDetails } from "@/hooks/useCalendarEventDetails";
import { useCurrentUser } from "@/hooks/useProfile";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { useTranslation } from "react-i18next";

export default function CalendarPage() {
    const { t } = useTranslation();
    const { setRange } = useDateStore();
    const { data: currentUser } = useCurrentUser();

    const { data: allEquipment = [], isLoading: isLoadingEquipment } = useAllEquipment();
    const {
        typeFilter, setTypeFilter, brandFilter, setBrandFilter, searchText, setSearchText,
        availableTypes, availableBrands, resetFilters,
    } = useCalendarFilters({ allEquipment });

    const { navigateToOrder } = useCalendarNavigation({ context: 'admin' });

    // Состояния для модального окна
    const [modalData, setModalData] = useState<CalendarEventDetails | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<{ orderType: "reservation" | "rental"; orderId: number } | null>(null);

    // Хук для загрузки деталей события
    const { data: eventDetails } = useCalendarEventDetails(
        selectedEvent?.orderType,
        selectedEvent?.orderId
    );

    const filteredEquipment = useMemo(() => {
        return allEquipment.filter(item =>
            (!typeFilter || item.equipment_type === typeFilter) &&
            (!brandFilter || item.brand === brandFilter) &&
            (!searchText || item.name.toLowerCase().includes(searchText.toLowerCase()))
        );
    }, [allEquipment, typeFilter, brandFilter, searchText]);

    const filteredIds = useMemo(() => filteredEquipment.map(item => item.id), [filteredEquipment]);
    
    // Эта функция проверяет, имеет ли текущий пользователь право на действие
    const isUserActionAllowed = useCallback((eventUserId: number) => {
        if (!currentUser) return false;
        return currentUser.id === eventUserId || currentUser.role === 'admin' || currentUser.role === 'manager';
    }, [currentUser]);

    // Обработчик для двойного клика - устанавливает параметры для загрузки данных
    const handleShowDetails = useCallback(({ orderType, orderId }: { orderType: "reservation" | "rental"; orderId: number }) => {
        setSelectedEvent({ orderType, orderId });
    }, []);

    // Обработка загруженных данных события
    useEffect(() => {
        if (eventDetails && selectedEvent) {
            setModalData({ 
                order: eventDetails.order, 
                orderType: selectedEvent.orderType,
                isOwner: eventDetails.is_owner,
                hasExtendedAccess: eventDetails.has_extended_access
            });
        }
    }, [eventDetails, selectedEvent]);

    const handleNavigate = useCallback(({ orderType, orderId, userId }: { orderType: "reservation" | "rental"; orderId: number; userId: number }) => {
        navigateToOrder(orderType, orderId, userId);
    }, [navigateToOrder]);

    useEffect(() => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 3);
        const end = new Date(today);
        end.setDate(today.getDate() + 13);
        setRange(start, end);
    }, [setRange]);

    return (
        <div className="rental-container min-w-0 pb-12" onClick={() => setSelectedGroupId(null)}>
            <div className="flex flex-col gap-4 pb-7 pt-9 sm:pt-12">
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{t('shell.calendarPageTitle')}</h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{t('shell.calendarIntro')}</p>
            </div>

            <CalendarFiltersBlock
                availableTypes={availableTypes} availableBrands={availableBrands} typeFilter={typeFilter}
                setTypeFilter={setTypeFilter} brandFilter={brandFilter} setBrandFilter={setBrandFilter}
                searchText={searchText} setSearchText={setSearchText} onReset={() => { resetFilters(); setSelectedGroupId(null); }}
            />

            <CalendarLegend />

            <CalendarTable
                equipment={filteredEquipment}
                equipmentIds={filteredIds}
                isLoading={isLoadingEquipment}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onShowDetails={handleShowDetails}
                onNavigate={handleNavigate}
                isUserActionAllowed={isUserActionAllowed}
            />

            <CalendarEventDetailsModal
                isOpen={!!modalData}
                onClose={() => {
                    setModalData(null);
                    setSelectedEvent(null);
                }}
                eventData={modalData}
                onNavigateToOrder={navigateToOrder}
            />
        </div>
    );
}
