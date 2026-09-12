// rental-app-main/src/pages/MyReservationsPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import MyReservationList from "../components/MyReservationList";
import { useCurrentUser } from "@/hooks/useProfile";
import { useMyRentals } from "@/hooks/useMyRentals";
import MyRentalsList from "@/components/rental/MyRentalsList";
import { ClipboardList, Truck } from "lucide-react";
import OrderToolbar from "@/components/shared/OrderToolbar";
import { useOrderFilters } from "@/store/orderFilterStore";
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
    const { t } = useTranslation();
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<'reservations' | 'rentals'>('reservations');

    const locationState = location.state as MyReservationsLocationState | null;
    const continueEditingReservationId = locationState?.continueEditing;

    const toolbarContext = useMemo(() => {
        return activeTab === 'reservations' ? 'user-reservations' : 'user-rentals';
    }, [activeTab]);

    // Фильтры изолированы по контексту активной вкладки (этап 5.6)
    const { setStatusFilter } = useOrderFilters(toolbarContext);

    // Запрос аренд (уходит всегда, правила хуков) должен жить параметрами СВОЕЙ
    // вкладки, а не активной: раньше фильтры резервов утекали в фоновый запрос аренд
    const rentalsFilters = useOrderFilters('user-rentals');
    const rentalsParams = useMemo(() => ({
        search: rentalsFilters.searchQuery || undefined,
        status: (rentalsFilters.statusFilter === 'all' || rentalsFilters.statusFilter === 'hide-completed')
            ? undefined
            : (rentalsFilters.statusFilter || undefined),
        sort: rentalsFilters.sortOption
    }), [rentalsFilters.searchQuery, rentalsFilters.statusFilter, rentalsFilters.sortOption]);

    // Данные для аренд по-прежнему загружаются здесь
    const {
        data: rentalsData,
        fetchNextPage: fetchNextRentalPage,
        hasNextPage: hasNextRentalPage,
        isFetchingNextPage: isFetchingNextRentalPage
    } = useMyRentals(rentalsParams, 10);

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
        // Deep-link: Header на главной видит state.from и сразу открывает диалог входа
        const loginRedirect = () => navigate("/", { state: { from: `${location.pathname}${location.search}` } });
        return (
            <div className="text-center mt-12">
                <p className="text-lg">Только авторизованные пользователи могут просматривать свои резервы.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button onClick={loginRedirect}>Войти</Button>
                    <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-7 sm:px-6 sm:py-10 space-y-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('ordersDesign.myOrders')}</h1>
                    <p className="mt-3 text-sm text-muted-foreground">{t('ordersDesign.myOrdersNote')}</p>
                </div>
                <Button variant="outline" onClick={() => navigate("/")}>{t('ordersDesign.home')}</Button>
            </div>

            <ToggleGroup
                type="single"
                value={activeTab}
                onValueChange={(value) => { if (value === 'reservations' || value === 'rentals') setActiveTab(value); }}
                className="w-full justify-start sm:w-auto" aria-label={t('ordersDesign.orderType')}
            >
                <ToggleGroupItem value="reservations" className="min-h-11 flex-1 px-5 data-[state=on]:bg-info-soft data-[state=on]:text-primary sm:flex-none">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    {t('ordersDesign.reservations')}
                </ToggleGroupItem>
                <ToggleGroupItem value="rentals" className="min-h-11 flex-1 px-5 data-[state=on]:bg-info-soft data-[state=on]:text-primary sm:flex-none">
                    <Truck className="w-4 h-4 mr-2" />
                    {t('ordersDesign.rentals')}
                </ToggleGroupItem>
            </ToggleGroup>

            <OrderToolbar context={toolbarContext} showHideCompletedCheckbox={true} />

            {isFetchingNextRentalPage && activeTab === 'rentals' && (
                <div className="text-center text-primary py-2 text-sm">Поиск аренды в следующих страницах...</div>
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
