// src/components/CompactEquipmentCard.tsx

import React, { useCallback } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { formatDateRangeEuropean } from "@/lib/utils";
import { isEquipmentUnderRepair, getEquipmentCardStyles, getEquipmentStatusText } from "@/lib/equipmentUtils";
import { springs } from "@/lib/motion";

// ViewModel хук
import { useEquipmentCardViewModel } from "@/hooks/features/useEquipmentCardViewModel";

// Типы

import type { EquipmentStatus } from "@/types/availability";
import type { EquipmentCardSimpleProps, EquipmentCardBaseProps } from "@/types/equipmentCard";

// Упрощенный интерфейс для нового компонента
type CompactEquipmentCardProps = EquipmentCardSimpleProps;

// Старый интерфейс для обратной совместимости
type CompactEquipmentCardLegacyProps = EquipmentCardBaseProps;

// --- НАЧАЛО ИЗМЕНЕНИЙ ---

// 1. Упрощаем стили, удаляя `ending_today`
const COMPACT_STATUS_STYLES: Record<EquipmentStatus | "my_reservation" | "added", string> = {
    available: "bg-white border-gray-200 hover:bg-gray-50",
    reserved: "bg-reserved-soft border-reserved/40",
    rented: "bg-reserved-soft border-reserved/60",
    my_reservation: "bg-sky-50 border-sky-200 hover:bg-sky-100",
    added: "bg-info-soft border-primary/40",
};
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

// Современный паттерн выбора: фирменное кольцо + подъём карточки (без заливки зелёным)
const COMPACT_SELECTED_STYLES = "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary/60 bg-info-soft shadow-md -translate-y-0.5";
const COMPACT_HOVER_STYLES = "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/40";

const CompactEquipmentCardComponent: React.FC<CompactEquipmentCardProps> = (props) => {
    const { 
        equipment,
        dailyStatus,
        onToggleSelection: externalOnToggleSelection,
        onToggleAccessory: externalOnToggleAccessory,
        isAccessorySelected: externalIsAccessorySelected,
        startDate: externalStartDate,
        endDate: externalEndDate,
        status: externalStatus
    } = props;

    // Используем ViewModel для получения всей логики
    const cardConfig = useEquipmentCardViewModel({
    equipment,
        dailyStatus,
        onToggleSelection: externalOnToggleSelection,
        onToggleAccessory: externalOnToggleAccessory,
        isAccessorySelected: externalIsAccessorySelected,
        startDate: externalStartDate,
        endDate: externalEndDate,
        status: externalStatus
    });

    // Деструктурируем данные из ViewModel
    const {
    status,
    startDate,
    endDate,
    isSelected,
    onToggleSelection,
    accessoriesDailyRate,
    totalDiscountPercentage,
    discountData
    } = cardConfig;
    // Правила хуков: все хуки вызываются до возможного раннего return,
    // иначе смена исхода guard между рендерами роняет React
    const isUnderRepair = equipment ? isEquipmentUnderRepair(equipment) : false;
    const reducedMotion = useReducedMotion();

    const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest("button, a, label, input[type='checkbox']")) return;
        // Блокируем клик, если оборудование недоступно
        if (isUnderRepair) return;
        // Используем обработчик из пропсов
        if (status === 'available' || status === 'added') {
            onToggleSelection();
        }
    }, [status, onToggleSelection, isUnderRepair]);



    // Защитный код: проверяем, что все необходимые данные переданы
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('CompactEquipmentCard: Missing or invalid data', { equipment, discountData });
        return null;
    }

    // Используем данные из пропсов вместо внутренних вычислений
    const priceData = {
        dailyRate: equipment.daily_rate + accessoriesDailyRate,
        totalPrice: discountData.priceAfter,
        discountPercentage: totalDiscountPercentage,
        days: discountData.days,
    };

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Удаляем useMemo для finalStatus ---
    // const finalStatus: DisplayStatus = useMemo(() => { ... }); // ЭТОТ БЛОК ПОЛНОСТЬЮ УДАЛЕН
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    // Используем централизованную логику для определения стиля
    const cardStyles = getEquipmentCardStyles(equipment, isSelected);
    const backgroundClass = isSelected
        ? COMPACT_SELECTED_STYLES
        : isUnderRepair
            ? cardStyles.background + " " + cardStyles.border
            : COMPACT_STATUS_STYLES[status];

    // Hover-отклик только для выбираемых, но ещё не выбранных карточек
    const canSelect = !isUnderRepair && (status === 'available' || status === 'added');
    const hoverClass = !isSelected && canSelect ? COMPACT_HOVER_STYLES : "";

    const dateRangeDisplay = (startDate && endDate)
        ? `(${formatDateRangeEuropean(startDate, endDate)})`
        : "";

    return (
        <div
            className={`relative h-full p-4 rounded-xl border transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${backgroundClass} ${hoverClass}`}
            onClick={handleCardClick}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={equipment.name}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!isUnderRepair && (status === 'available' || status === 'added')) onToggleSelection();
                }
            }}
        >
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        key="selected-badge"
                        initial={{ scale: reducedMotion ? 1 : 0, opacity: reducedMotion ? 1 : 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: reducedMotion ? 1 : 0.6, opacity: 0 }}
                        transition={reducedMotion ? { duration: 0 } : springs.pop}
                        className="absolute top-2 right-2 z-10 grid place-items-center rounded-full bg-primary p-1 text-primary-foreground shadow-md"
                    >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-2">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate" title={equipment.name}>
                        {equipment.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                        {equipment.brand} • {equipment.equipment_type}
                    </p>
                    {dateRangeDisplay && (
                        <p className="text-xs text-gray-400">{dateRangeDisplay}</p>
                    )}
                </div>

                <div className="space-y-1">
                    {isUnderRepair ? (
                        <div className="text-center">
                            <span className="text-xs font-medium text-gray-500">
                                {getEquipmentStatusText(equipment)}
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">
                                    {priceData.days} {priceData.days === 1 ? 'день' : priceData.days < 5 ? 'дня' : 'дней'}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {priceData.totalPrice.toLocaleString('ru-RU')} ₽
                                </span>
                            </div>

                            {priceData.discountPercentage > 0 && (
                                <div className="text-xs text-green-600">
                                    Скидка: {priceData.discountPercentage.toFixed(0)}%
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* --- НАЧАЛО ИЗМЕНЕНИЙ: Упрощенный блок статуса с поддержкой недоступности --- */}
                <div className="text-xs">
                    {isUnderRepair ? (
                        <span className="text-gray-500 font-medium">Недоступно</span>
                    ) : (
                        <>
                            {status === 'available' && (
                                <span className="text-green-600 font-medium">Свободно</span>
                            )}
                            {status === 'reserved' && (
                                <span className="text-reserved-foreground font-medium">В резерве</span>
                            )}
                            {status === 'rented' && (
                                <span className="text-reserved-foreground font-medium">В аренде</span>
                            )}
                            {status === 'my_reservation' && (
                                <span className="text-sky-600 font-medium">В этом резерве</span>
                            )}
                            {status === 'added' && (
                                <span className="text-emerald-600 font-medium">Добавлено</span>
                            )}
                        </>
                    )}
                </div>
                {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
            </div>
        </div>
    );
};

// Компонент для обратной совместимости (старый API)
const CompactEquipmentCardLegacyComponent: React.FC<CompactEquipmentCardLegacyProps> = ({
    equipment,
    status,
    startDate,
    endDate,
    isSelected,
    isAccessorySelected,
    onToggleAccessory,
    isCalculatorVisible,
    discountData,
}) => {
    // Правила хуков: хуки до guard; equipment.id вычисляем безопасно
    const equipmentId = equipment?.id ?? -1;

    const handleToggleAccessory = useCallback((e: React.MouseEvent, accessoryId: number) => {
        e.stopPropagation();
        if (equipmentId === -1) return;
        onToggleAccessory(equipmentId, accessoryId);
    }, [onToggleAccessory, equipmentId]);

    // Защитный код: проверяем, что все необходимые данные переданы
    if (!equipment || !discountData || typeof discountData.priceAfter !== 'number') {
        console.warn('CompactEquipmentCardLegacy: Missing or invalid data', { equipment, discountData });
        return null;
    }

    const isUnderRepair = isEquipmentUnderRepair(equipment);

    const backgroundClass = COMPACT_STATUS_STYLES[status] || COMPACT_STATUS_STYLES.available;
    const selectionClass = isSelected ? COMPACT_SELECTED_STYLES : "";
    const dateRangeDisplay = (startDate && endDate) ? `(${formatDateRangeEuropean(startDate, endDate)})` : "";

    return (
        <div className={`relative group rounded-lg shadow-sm transition w-full flex items-center justify-between cursor-pointer overflow-hidden ${backgroundClass} ${selectionClass}`}>
            {isSelected && <div className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground rounded-full p-0.5 shadow"><Check className="w-3 h-3" /></div>}

            <div className="flex-1 p-3 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold truncate">{equipment.name}</h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{equipment.brand}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{equipment.equipment_type}</span>
                    <span className="font-medium">{equipment.daily_rate} ₽/день</span>
                </div>

                {dateRangeDisplay && (
                    <div className="text-xs text-gray-500 mb-1">{dateRangeDisplay}</div>
                )}

                {isCalculatorVisible && discountData.percentage > 0 && (
                    <div className="text-xs text-green-600 font-medium">
                        Скидка {discountData.percentage}%: {Math.round(discountData.priceAfter)} ₽
                    </div>
                )}

                {equipment.accessories && equipment.accessories.length > 0 && (
                    <div className="mt-1">
                        {equipment.accessories.slice(0, 2).map((accessory) => {
                            const isSelected = isAccessorySelected(equipment.id, accessory.id);
                            return (
                                <div key={accessory.id} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">{accessory.name}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-500">{accessory.price} ₽</span>
                                        <button
                                            onClick={(e) => handleToggleAccessory(e, accessory.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                                                isSelected 
                                                    ? 'bg-primary border-primary text-primary-foreground' 
                                                    : 'border-gray-300 hover:border-primary/60'
                                            }`}
                                        >
                                            {isSelected && '✓'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {equipment.accessories.length > 2 && (
                            <div className="text-xs text-gray-500">+{equipment.accessories.length - 2} еще</div>
                        )}
                    </div>
                )}

                <div className="text-xs">
                    {isUnderRepair ? (
                        <span className="text-gray-500 font-medium">Недоступно</span>
                    ) : (
                        <>
                            {status === 'available' && (
                                <span className="text-green-600 font-medium">Свободно</span>
                            )}
                            {status === 'reserved' && (
                                <span className="text-reserved-foreground font-medium">В резерве</span>
                            )}
                            {status === 'rented' && (
                                <span className="text-reserved-foreground font-medium">В аренде</span>
                            )}
                            {status === 'my_reservation' && (
                                <span className="text-sky-600 font-medium">В этом резерве</span>
                            )}
                            {status === 'added' && (
                                <span className="text-emerald-600 font-medium">Добавлено</span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Мемоизированная версия нового компонента
export const CompactEquipmentCard = React.memo(CompactEquipmentCardComponent, (prevProps, nextProps) => {
    // Сравниваем только основные пропсы, так как остальная логика в ViewModel
    if (prevProps.equipment !== nextProps.equipment ||
        prevProps.dailyStatus !== nextProps.dailyStatus ||
        prevProps.startDate !== nextProps.startDate ||
        prevProps.endDate !== nextProps.endDate ||
        prevProps.status !== nextProps.status) {
        return false;
    }
    
    return true;
});

// Экспорт для обратной совместимости
export const CompactEquipmentCardLegacy = React.memo(CompactEquipmentCardLegacyComponent, (prevProps, nextProps) => {
    // Сравниваем основные пропсы
    if (prevProps.equipment !== nextProps.equipment ||
        prevProps.status !== nextProps.status ||
        prevProps.startDate !== nextProps.startDate ||
        prevProps.endDate !== nextProps.endDate ||
        prevProps.dailyStatus !== nextProps.dailyStatus ||
        prevProps.isSelected !== nextProps.isSelected ||
        prevProps.isCalculatorVisible !== nextProps.isCalculatorVisible ||
        prevProps.accessoriesDailyRate !== nextProps.accessoriesDailyRate ||
        prevProps.totalDiscountPercentage !== nextProps.totalDiscountPercentage ||
        prevProps.discountData !== nextProps.discountData) {
        return false;
    }
    
    return true;
});

// Экспорт по умолчанию - новый компонент
export default CompactEquipmentCard;