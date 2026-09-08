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

interface MyReservationsLocationState {
    from?: string;
    continueEditing?: number;
    highlightRentalId?: number;
    highlightReservationId?: number;
}

export default function MyReservationsPage() {
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<'reservations' | 'rentals'>('reservations');

    const locationState = location.state as MyReservationsLocationState | null;
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
    const { 
        data: rentalsData, 
        fetchNextPage: fetchNextRentalPage, 
        hasNextPage: hasNextRentalPage, 
        isFetchingNextPage: isFetchingNextRentalPage 
    } = useMyRentals(apiParams, 10);
    
    // ❌ Логика загрузки резервов отсюда УДАЛЕНА

    const { highlightState, getHighlightClasses, elementRef } = useHighlightLogic();

    useEffect(() => {
        const { highlightRentalId, highlightReservationId, from } = locationState || {};
        if (highlightRentalId) {
            setActiveTab('rentals');
        } else if (highlightReservationId) {
            setActiveTab('reservations');
            if (from === 'rental') {
                setStatusFilter('all');
            }
        }
    }, [locationState, setStatusFilter]);

    const allRentals = useMemo(() => {
        if (!rentalsData?.pages) return [];
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
        return (
            <div className="max-w-4xl mx-auto px-4 py-6" role="status" aria-label="Загрузка профиля">
                <SkeletonList count={3} columns="single" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center mt-12">
                <p className="text-lg">Только авторизованные пользователи могут просматривать свои резервы.</p>
                <Button className="mt-4" onClick={() => navigate("/")}>На главную</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Мои заказы</h1>
                <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>
            </div>

            <ToggleGroup
                type="single"
                value={activeTab}
                onValueChange={(value) => { if (value === 'reservations' || value === 'rentals') setActiveTab(value); }}
                className="w-full"
            >
                <ToggleGroupItem value="reservations" className="w-1/2 data-[state=on]:bg-sky-100 data-[state=on]:text-sky-800">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Резервы
                </ToggleGroupItem>
                <ToggleGroupItem value="rentals" className="w-1/2 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-800">
                    <Truck className="w-4 h-4 mr-2" />
                    Аренды
                </ToggleGroupItem>
            </ToggleGroup>
            
            <OrderToolbar context={toolbarContext} showHideCompletedCheckbox={true} />

            {isFetchingNextRentalPage && activeTab === 'rentals' && (
                <div className="text-center text-blue-600 py-2 text-sm">Поиск аренды в следующих страницах...</div>
            )}

            <div>
                {activeTab === 'reservations' ? (
                    <MyReservationList
                        continueEditingReservationId={continueEditingReservationId}
                        getHighlightClasses={getHighlightClasses}
                        elementRef={elementRef}
                    />
                ) : (
                    <MyRentalsList 
                        getHighlightClasses={getHighlightClasses}
                        elementRef={elementRef}
                        highlightId={highlightState.id}
                        rentalsData={rentalsData}
                    />
                )}
            </div>
        </div>
    );
}