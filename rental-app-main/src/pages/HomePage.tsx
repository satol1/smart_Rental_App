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
import { cn } from "@/lib/utils";

export default function HomePage() {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const { clearItemsOnly, items: selectedItems = [] } = useReserveStore();
    
    // Состояние для управления модальным окном пачки
    const [selectedPack, setSelectedPack] = useState<CatalogPackItem | null>(null);
    
    // Состояние для управления "липким" компактным блоком выбора дат
    const [isSticky, setIsSticky] = useState(false);
    const [placeholderHeight, setPlaceholderHeight] = useState<number>(0);
    const dateSelectorRef = useRef<HTMLDivElement>(null);
    
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

    // Измеряем реальную высоту развернутого блока выбора дат, чтобы при сворачивании не прыгала страница
    useEffect(() => {
        if (!dateSelectorRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (!isSticky && entry.target) {
                    const height = (entry.target as HTMLElement).offsetHeight;
                    if (height > 0) {
                        setPlaceholderHeight(height);
                    }
                }
            }
        });
        resizeObserver.observe(dateSelectorRef.current);
        return () => resizeObserver.disconnect();
    }, [isSticky]);

    // Отслеживаем скролл: когда верх модуля выбора дат доходит до шапки (80px),
    // он сворачивается и магнитится к шапке в виде компактного StickyDateBar
    useEffect(() => {
        let ticking = false;

        const updateStickyState = () => {
            if (!dateSelectorRef.current) return;
            const rect = dateSelectorRef.current.getBoundingClientRect();
            // Высота шапки — 80px (h-20). Когда верхний край модуля касается шапки,
            // он сворачивается в компактный sticky bar
            const shouldBeSticky = rect.top <= 80;
            setIsSticky((prev) => (prev !== shouldBeSticky ? shouldBeSticky : prev));
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateStickyState();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        // Проверяем начальное положение при загрузке
        updateStickyState();

        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    // Получаем логику управления резервами для каталога
    const {
        editingReservationId,
        intent,
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
        const navState = location.state as { startDate?: string; endDate?: string } | null;
        const start = navState?.startDate;
        const end = navState?.endDate;
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

                <div 
                    ref={dateSelectorRef}
                    style={{ minHeight: isSticky && placeholderHeight > 0 ? `${placeholderHeight}px` : undefined }}
                    className="transition-all duration-200"
                >
                    <div className={cn(
                        "transition-opacity duration-200",
                        isSticky ? "opacity-0 invisible pointer-events-none" : "opacity-100 visible"
                    )}>
                        <DateRangeSelector 
                            containerRef={containerRef} 
                            collapsed={isSticky ? true : undefined} 
                            isSticky={isSticky} 
                        />
                    </div>
                </div>
                <DiscountCalculator />

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