import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/pages/CalendarPage.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import { useDateStore } from "@/store/dateStore";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useCalendarFilters } from "@/hooks/features/useCalendarFilters";
import CalendarFiltersBlock from "@/components/calendar/CalendarFiltersBlock";
import CalendarTable from "@/components/calendar/CalendarTable";
import CalendarEventDetailsModal from "@/components/calendar/CalendarEventDetailsModal";
import { useCalendarNavigation } from "@/hooks/useCalendarNavigation";
import { useCalendarEventDetails } from "@/hooks/useCalendarEventDetails";
import { useCurrentUser } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
export default function CalendarPage() {
    const { setRange } = useDateStore();
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();
    const { data: allEquipment = [], isLoading: isLoadingEquipment } = useAllEquipment();
    const { typeFilter, setTypeFilter, brandFilter, setBrandFilter, searchText, setSearchText, availableTypes, availableBrands, resetFilters, } = useCalendarFilters({ allEquipment });
    const { navigateToOrder } = useCalendarNavigation({ context: 'admin' });
    // Состояния для модального окна
    const [modalData, setModalData] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    // Хук для загрузки деталей события
    const { data: eventDetails } = useCalendarEventDetails(selectedEvent?.orderType, selectedEvent?.orderId);
    const filteredEquipment = useMemo(() => {
        return allEquipment.filter(item => (!typeFilter || item.equipment_type === typeFilter) &&
            (!brandFilter || item.brand === brandFilter) &&
            (!searchText || item.name.toLowerCase().includes(searchText.toLowerCase())));
    }, [allEquipment, typeFilter, brandFilter, searchText]);
    const filteredIds = useMemo(() => filteredEquipment.map(item => item.id), [filteredEquipment]);
    // Эта функция проверяет, имеет ли текущий пользователь право на действие
    const isUserActionAllowed = useCallback((eventUserId) => {
        if (!currentUser)
            return false;
        return currentUser.id === eventUserId || currentUser.role === 'admin' || currentUser.role === 'manager';
    }, [currentUser]);
    // Обработчик для двойного клика - устанавливает параметры для загрузки данных
    const handleShowDetails = useCallback(({ orderType, orderId }) => {
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
    const handleNavigate = useCallback(({ orderType, orderId, userId }) => {
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
    // ✅ 2. Оборачиваем всю страницу в div с onClick для сброса выделения
    _jsxs("div", { className: "p-4 space-y-4", onClick: () => setSelectedGroupId(null), children: [_jsx("div", { className: "flex justify-between items-center mb-4", children: _jsxs(Button, { variant: "outline", onClick: () => navigate("/"), className: "flex items-center gap-2", children: [_jsx(Home, { className: "w-4 h-4" }), "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E"] }) }), _jsx(CalendarLegend, {}), _jsx(CalendarFiltersBlock, { availableTypes: availableTypes, availableBrands: availableBrands, typeFilter: typeFilter, setTypeFilter: setTypeFilter, brandFilter: brandFilter, setBrandFilter: setBrandFilter, searchText: searchText, setSearchText: setSearchText, onReset: () => { resetFilters(); setSelectedGroupId(null); } }), _jsx(CalendarTable, { equipment: filteredEquipment, equipmentIds: filteredIds, isLoading: isLoadingEquipment, selectedGroupId: selectedGroupId, onSelectGroup: setSelectedGroupId, onShowDetails: handleShowDetails, onNavigate: handleNavigate, isUserActionAllowed: isUserActionAllowed }), _jsx(CalendarEventDetailsModal, { isOpen: !!modalData, onClose: () => {
                    setModalData(null);
                    setSelectedEvent(null);
                }, eventData: modalData, onNavigateToOrder: navigateToOrder })] }));
}
