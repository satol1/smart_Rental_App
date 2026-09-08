import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// rental-app-main/src/pages/MyReservationsPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import MyReservationList from "../components/MyReservationList";
import { useCurrentUser } from "@/hooks/useProfile";
import { useMyRentals } from "@/hooks/useMyRentals";
import MyRentalsList from "@/components/rental/MyRentalsList";
import { ClipboardList, Truck } from "lucide-react";
import OrderToolbar from "@/components/shared/OrderToolbar";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import { useAutoLoaderForItem } from "@/hooks/useAutoLoaderForItem";
import { SkeletonList } from "@/components/ui/skeleton-list";
export default function MyReservationsPage() {
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('reservations');
    const locationState = location.state;
    const continueEditingReservationId = locationState?.continueEditing;
    const searchQuery = useOrderFilterStore(state => state.searchQuery);
    const statusFilter = useOrderFilterStore(state => state.statusFilter);
    const sortOption = useOrderFilterStore(state => state.sortOption);
    const setStatusFilter = useOrderFilterStore(state => state.setStatusFilter);
    const toolbarContext = useMemo(() => {
        return activeTab === 'reservations' ? 'user-reservations' : 'user-rentals';
    }, [activeTab]);
    const apiParams = useMemo(() => ({
        search: searchQuery || undefined,
        status: (statusFilter === 'all' || statusFilter === 'hide-completed') ? undefined : (statusFilter || undefined),
        sort: sortOption
    }), [searchQuery, statusFilter, sortOption]);
    // Данные для аренд по-прежнему загружаются здесь
    const { data: rentalsData, fetchNextPage: fetchNextRentalPage, hasNextPage: hasNextRentalPage, isFetchingNextPage: isFetchingNextRentalPage } = useMyRentals(apiParams, 10);
    // ❌ Логика загрузки резервов отсюда УДАЛЕНА
    const { highlightState, getHighlightClasses, elementRef } = useHighlightLogic();
    useEffect(() => {
        const { highlightRentalId, highlightReservationId, from } = locationState || {};
        if (highlightRentalId) {
            setActiveTab('rentals');
        }
        else if (highlightReservationId) {
            setActiveTab('reservations');
            if (from === 'rental') {
                setStatusFilter('all');
            }
        }
    }, [locationState, setStatusFilter]);
    const allRentals = useMemo(() => {
        if (!rentalsData?.pages)
            return [];
        const flatList = rentalsData.pages.flatMap(page => page?.items || []);
        return flatList.filter(item => item && item.id);
    }, [rentalsData]);
    useAutoLoaderForItem({
        items: allRentals,
        targetId: highlightState.id,
        hasNextPage: !!hasNextRentalPage,
        isFetching: isFetchingNextRentalPage,
        fetchNextPage: fetchNextRentalPage
    });
    if (isLoading) {
        return (_jsx("div", { className: "max-w-4xl mx-auto px-4 py-6", role: "status", "aria-label": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", children: _jsx(SkeletonList, { count: 3, className: "grid-cols-1" }) }));
    }
    if (!user) {
        return (_jsxs("div", { className: "text-center mt-12", children: [_jsx("p", { className: "text-lg", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u0440\u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044C \u0441\u0432\u043E\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u044B." }), _jsx(Button, { className: "mt-4", onClick: () => navigate("/"), children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }));
    }
    return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\u041C\u043E\u0438 \u0437\u0430\u043A\u0430\u0437\u044B" }), _jsx(Button, { variant: "outline", onClick: () => navigate("/"), children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }), _jsxs(ToggleGroup, { type: "single", value: activeTab, onValueChange: (value) => { if (value === 'reservations' || value === 'rentals')
                    setActiveTab(value); }, className: "w-full", children: [_jsxs(ToggleGroupItem, { value: "reservations", className: "w-1/2 data-[state=on]:bg-sky-100 data-[state=on]:text-sky-800", children: [_jsx(ClipboardList, { className: "w-4 h-4 mr-2" }), "\u0420\u0435\u0437\u0435\u0440\u0432\u044B"] }), _jsxs(ToggleGroupItem, { value: "rentals", className: "w-1/2 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-800", children: [_jsx(Truck, { className: "w-4 h-4 mr-2" }), "\u0410\u0440\u0435\u043D\u0434\u044B"] })] }), _jsx(OrderToolbar, { context: toolbarContext, showHideCompletedCheckbox: true }), isFetchingNextRentalPage && activeTab === 'rentals' && (_jsx("div", { className: "text-center text-blue-600 py-2 text-sm", children: "\u041F\u043E\u0438\u0441\u043A \u0430\u0440\u0435\u043D\u0434\u044B \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430\u0445..." })), _jsx("div", { children: activeTab === 'reservations' ? (_jsx(MyReservationList, { continueEditingReservationId: continueEditingReservationId, getHighlightClasses: getHighlightClasses, elementRef: elementRef })) : (_jsx(MyRentalsList, { getHighlightClasses: getHighlightClasses, elementRef: elementRef, highlightId: highlightState.id, rentalsData: rentalsData })) })] }));
}
