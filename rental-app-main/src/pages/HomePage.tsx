// src/pages/HomePage.tsx

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useReserveStore } from "@/store/reserveStore";
import { X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { CuratedCollections } from '@/components/catalog/CuratedCollections';
import type { CatalogPackItem } from "@/types/catalog";

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

export default function HomePage() {
    const { t } = useTranslation();
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const { clearItemsOnly, items: selectedItems = [] } = useReserveStore();
    
    // Состояние для управления модальным окном пачки
    const [selectedPack, setSelectedPack] = useState<CatalogPackItem | null>(null);
    
    // Состояние для управления "липким" компактным блоком выбора дат
    const [isSticky, setIsSticky] = useState(false);
    const dateSelectorRef = useRef<HTMLDivElement>(null);
    
    // Получаем нужные данные и функции из хранилищ
    const { setRange, initializeDates, startDate, endDate } = useDateStore();
    const { holidays } = useHolidayStore();
    const { viewMode } = useViewModeStore(); // ✅ ПОЛУЧАЕМ РЕЖИМ ОТОБРАЖЕНИЯ ИЗ ХРАНИЛИЩА
    const [datesInitialized, setDatesInitialized] = useState(false);

    const { returnFromEquipmentSelection, cancelAndReturn } = useReservationNavigation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА

    // Получаем состояние фильтров для передачи в EquipmentCatalog
    const { query, type, availableOnly, associationId, startDate: filterStartDate, endDate: filterEndDate } = useAppFilters();

    // Получаем данные оборудования для useReservationManagement (пагинированные)
    const {
        equipment,
        availabilityData,
    } = useEquipmentData({
        query,
        type: type ?? undefined,
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


    // Отслеживаем скролл: когда большой модуль выбора дат полностью скрывается за шапкой (80px),
    // активируется компактный плавающий StickyDateBar, который остаётся прикреплённым к шапке
    // до самого низа страницы и плавно скрывается при возврате наверх
    useEffect(() => {
        let ticking = false;

        const updateStickyState = () => {
            if (!dateSelectorRef.current) return;
            const rect = dateSelectorRef.current.getBoundingClientRect();
            // Порог: нижний край модуля ушёл под шапку (80px)
            const shouldBeSticky = rect.bottom <= 80;
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
    } = useReservationManagement(equipment, availabilityMap);

    // Получаем логику управления резервами для модального окна пачки
    const {
        getEquipmentStatus: getEquipmentStatusForModal,
    } = useReservationManagement(equipmentForModal, availabilityMapForModal);

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
        <div className="rental-home">
            {/* Липкий блок выбора дат */}
            <StickyDateBar isVisible={isSticky} />
            
            <div ref={containerRef} className="rental-container">

                {editingReservationId && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-pastel-sky p-4 text-sm text-pastel-sky-fg" role="status">
                        <span>
                            {t('catalogDesign.editNotice', { id: editingReservationId })}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelAndReturn}
                            className="text-primary hover:bg-primary/15 hover:text-primary flex-shrink-0"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t('catalogDesign.cancelEditing')}
                        </Button>
                    </div>
                )}

                <div className="catalog-introduction">
                    <h1>{t('catalogDesign.title')}</h1>
                    <p>{t('catalogDesign.intro')}</p>
                </div>

                <div 
                    id="main-date-range-selector"
                    ref={dateSelectorRef}
                    className="w-full"
                >
                    <DateRangeSelector 
                        containerRef={containerRef} 
                    />
                </div>
                <DiscountCalculator />

                <EquipmentCatalog 
                    collections={!editingReservationId ? <CuratedCollections equipment={allEquipment} /> : undefined}
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
