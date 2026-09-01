// src/pages/HomePage.tsx

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useReserveStore } from "@/store/reserveStore";
import { X } from "lucide-react";
import type { CatalogPackItem } from "@/types/pack";

// Компоненты
import DateRangeSelector from "@/components/DateRangeSelector";
import DiscountCalculator from "@/components/DiscountCalculator";
import ReservationFooter from "@/components/ReservationFooter";
import EquipmentCatalog from "@/components/catalog/EquipmentCatalog";
import PackDetailsModal from "@/components/pack/PackDetailsModal";
import StickyDateBar from "@/components/layout/StickyDateBar";
import { Button } from "@/components/ui/button";

// Хуки
import { useReservationManagement } from "@/hooks/useReservationManagement";
import { useDateStore } from "@/store/dateStore";
import { useHolidayStore } from "@/store/holidayStore";
import { useViewModeStore } from "@/store/viewModeStore"; // ✅ ИМПОРТ ХРАНИЛИЩА РЕЖИМА ОТОБРАЖЕНИЯ
import { useEquipmentData } from "@/hooks/data/useEquipmentData";
import { useAppFilters } from "@/hooks/features/useAppFilters";
import { useReservationNavigation } from "@/hooks/useReservationNavigation"; // <-- ИМПОРТ ХУКА
import { useAllEquipment } from "@/hooks/useAllEquipment"; // <-- СПРАВОЧНИК ВСЕГО ОБОРУДОВАНИЯ
import { useAvailabilityForEquipment } from "@/hooks/useAvailabilityForEquipment"; // <-- ХУК ДЛЯ ДОСТУПНОСТИ ОБОРУДОВАНИЯ ПАЧКИ
import { createAvailabilityMap } from "@/lib/equipmentUtils"; // <-- УТИЛИТАРНАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ КАРТЫ ДОСТУПНОСТИ
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"; // <-- ХУК ДЛЯ ОТСЛЕЖИВАНИЯ ВИДИМОСТИ

export default function HomePage() {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const { clearItemsOnly, items: selectedItems = [] } = useReserveStore();
    
    // Состояние для управления модальным окном пачки
    const [selectedPack, setSelectedPack] = useState<CatalogPackItem | null>(null);
    
    // Состояние для управления "липким" блоком
    const [isSticky, setIsSticky] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    
    // Получаем нужные данные и функции из хранилищ
    const { setRange, initializeDates, startDate, endDate } = useDateStore();
    const { holidays } = useHolidayStore();
    const { viewMode } = useViewModeStore(); // ✅ ПОЛУЧАЕМ РЕЖИМ ОТОБРАЖЕНИЯ ИЗ ХРАНИЛИЩА
    const [datesInitialized, setDatesInitialized] = useState(false);

    const { returnFromEquipmentSelection, cancelAndReturn } = useReservationNavigation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА

    // Получаем состояние фильтров для передачи в EquipmentCatalog
    const { query, type, brand, availableOnly, associationId, startDate: filterStartDate, endDate: filterEndDate } = useAppFilters();

    // Получаем данные оборудования для useReservationManagement (пагинированные)
    const {
        equipment,
        availabilityData,
        dailyAvailabilityData,
    } = useEquipmentData({
        query,
        type: type ?? undefined,
        brand: brand ?? undefined,
        associationId: associationId ?? undefined,
        availableOnly,
        startDate: filterStartDate ?? undefined,
        endDate: filterEndDate ?? undefined,
    });
    
    // ✅ СПРАВОЧНИК ВСЕГО ОБОРУДОВАНИЯ (независимо от пагинации)
    const { data: allEquipment = [], isLoading: isLoadingAllEquipment } = useAllEquipment();
    
    // Функция для получения данных оборудования пачки из ПОЛНОГО справочника
    const getPackEquipmentData = useCallback((pack: CatalogPackItem) => {
        // ✅ ИСПОЛЬЗУЕМ `allEquipment` ВМЕСТО `equipment` для гарантии полноты данных
        const packIds = new Set(pack.equipment_ids);
        return allEquipment.filter(eq => packIds.has(eq.id));
    }, [allEquipment]); // ✅ Зависимость теперь от полного списка

    // Мемоизированный список оборудования для модального окна пачки
    const equipmentForModal = useMemo(() => {
        if (!selectedPack) return [];
        return getPackEquipmentData(selectedPack);
    }, [selectedPack, getPackEquipmentData]);

    // Получаем данные о доступности для оборудования пачки
    const { 
        availabilityData: availabilityForModal, 
        dailyAvailabilityData: dailyAvailabilityForModal 
    } = useAvailabilityForEquipment(equipmentForModal);

    // Создаем availabilityMap из availabilityData для useReservationManagement (каталог)
    const availabilityMap = useMemo(() => createAvailabilityMap(availabilityData), [availabilityData]);

    // Создаем availabilityMap для оборудования пачки
    const availabilityMapForModal = useMemo(() => createAvailabilityMap(availabilityForModal), [availabilityForModal]);

    // Используем Intersection Observer для отслеживания видимости DiscountCalculator
    useIntersectionObserver(
        triggerRef,
        (isIntersecting) => {
            // Когда DiscountCalculator уходит из видимости, показываем sticky bar
            setIsSticky(!isIntersecting);
        },
        {
            root: null,
            rootMargin: '0px',
            threshold: 0
        }
    );

    // Получаем логику управления резервами для каталога
    const {
        editingReservationId,
        intent,
        getEquipmentStatus,
    } = useReservationManagement(equipment, availabilityMap, availableOnly);

    // Получаем логику управления резервами для модального окна пачки
    const {
        getEquipmentStatus: getEquipmentStatusForModal,
    } = useReservationManagement(equipmentForModal, availabilityMapForModal, availableOnly);

    // +++ НАЧАЛО: ДОБАВЛЕНА ЛОГИКА ИНИЦИАЛИЗАЦИИ ДАТ +++
    // 1. Инициализируем даты, как только выходные загружены
    useEffect(() => {
        // Выполняем только один раз, когда появились данные о выходных
        if (holidays.length > 0 && !datesInitialized) {
            initializeDates(holidays);
            setDatesInitialized(true);
        }
    }, [holidays, initializeDates, datesInitialized]);
    // +++ КОНЕЦ +++

    // Синхронизация дат из состояния навигации
    useEffect(() => {
        const start = (location.state as any)?.startDate;
        const end = (location.state as any)?.endDate;
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            setRange(startDate, endDate, 'manual', holidays); // Передаем праздники для корректного расчета
        }
    }, [location.state, setRange, holidays]);

    // Удалены локальные обработчики навигации; используем useReservationNavigation

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Липкий блок выбора дат */}
            <StickyDateBar isVisible={isSticky} />
            
            <div ref={containerRef} className="max-w-7xl mx-auto px-4 py-6 space-y-4 pb-20">

                {editingReservationId && (
                    <div className="flex items-center justify-between p-3 bg-sky-100 border border-sky-300 text-sky-700 rounded-md text-sm shadow">
                        <span>
                            Вы добавляете оборудование к резерву <strong>#{editingReservationId}</strong>. Когда закончите, нажмите кнопку внизу страницы.
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelAndReturn}
                            className="text-sky-700 hover:bg-sky-200 hover:text-sky-800 flex-shrink-0"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            Отменить добавление
                        </Button>
                    </div>
                )}

                <h1 className="text-2xl font-bold mt-4 text-center">Каталог оборудования</h1>

                <DateRangeSelector 
                    containerRef={containerRef} 
                    collapsed={isSticky ? true : undefined} 
                    isSticky={isSticky} 
                />
                <div ref={triggerRef}>
                    <DiscountCalculator />
                </div>

                <EquipmentCatalog 
                    editingReservationId={editingReservationId ?? undefined}
                    intent={intent ?? undefined}
                    onOpenPackDetails={setSelectedPack}
                />
            </div>

            <ReservationFooter
                selectedCount={selectedItems.length}
                onClick={returnFromEquipmentSelection}
                onReset={clearItemsOnly}
                isEditingMode={!!editingReservationId}
                intent={intent || ''}
                startDate={startDate}
                endDate={endDate}
            />

            <PackDetailsModal 
                pack={selectedPack}
                isOpen={!!selectedPack}
                onClose={() => setSelectedPack(null)}
                equipmentData={equipmentForModal}
                availabilityData={availabilityForModal}
                dailyAvailabilityData={dailyAvailabilityForModal}
                isLoading={isLoadingAllEquipment}
                viewMode={viewMode} // ✅ ПЕРЕДАЕМ РЕЖИМ ОТОБРАЖЕНИЯ В МОДАЛЬНОЕ ОКНО
                getEquipmentStatus={getEquipmentStatusForModal} // ✅ ПЕРЕДАЕМ ФУНКЦИЮ ДЛЯ ОПРЕДЕЛЕНИЯ СТАТУСА ОБОРУДОВАНИЯ ПАЧКИ
            />
            
        </div>
    );
}