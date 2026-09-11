// src/components/CompactPackCard.tsx

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Package } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonGesture, springs } from "@/lib/motion";
import type { CatalogPackItem } from "@/types/catalog";
import { usePackCardViewModel } from "@/hooks/features/usePackCardViewModel";

const MotionButton = motion.create(Button);

interface CompactPackCardProps {
    pack: CatalogPackItem;
    onOpenDetails?: (pack: CatalogPackItem) => void;
}

const CompactPackCardComponent: React.FC<CompactPackCardProps> = ({ 
    pack, 
    onOpenDetails 
}) => {
    const { t } = useTranslation();
    const reducedMotion = useReducedMotion();
    // Переиспользуем всю бизнес-логику из ViewModel
    const { 
        isAvailable,
        isAddedToReserve,
        priceDetails, 
        isLoadingPrice,
        handleReserveAction,
        buttonText,
        buttonVariant
    } = usePackCardViewModel(pack);

    // Определяем статус доступности и соответствующие стили
    const availabilityStatus = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "text-green-600"
            };
        }
        if (pack.available_count > 0) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "text-orange-600"
            };
        }
        return {
            text: `Доступно: 0 из ${pack.total_count}`,
            className: "text-reserved-foreground"
        };
    }, [pack.available_count, pack.total_count]);

    // Определяем цвет фона карточки в зависимости от статуса доступности
    const cardBackgroundClass = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return "bg-white border-gray-200 hover:bg-gray-50"; // Белый для полной доступности
        }
        if (pack.available_count > 0) {
            return "bg-orange-50 border-orange-200 hover:bg-orange-100"; // Оранжевый для частичной доступности
        }
        return "bg-reserved-soft border-reserved/40"; // Красноватый для недоступности
    }, [pack.available_count, pack.total_count]);

    // Выбранная пачка: фирменное кольцо + подъём; невыбранная доступная — hover-отклик
    const selectionClass = isAddedToReserve
        ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary/60 bg-info-soft shadow-md -translate-y-0.5"
        : cardBackgroundClass;
    const hoverClass = !isAddedToReserve && isAvailable
        ? "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/40"
        : "";

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.(pack);
    };

    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        handleReserveAction(e);
    };

    return (
        <div
            className={cn(
                "relative h-full p-4 rounded-xl border transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer",
                selectionClass,
                hoverClass
            )}
            onClick={handleCardClick}
        >
            <AnimatePresence>
                {isAddedToReserve && (
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

                {/* Заголовок и индикатор пачки */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-600">{t("catalogDesign.group")}</span>
                    </div>
                    <h3><button type="button" className="equipment-tile-title" onClick={() => onOpenDetails?.(pack)}>{pack.name}</button></h3>
                    <p className="text-xs text-gray-500">
                        {pack.brand} • {pack.equipment_type}
                    </p>
                </div>

                {/* Статус доступности */}
                <div className="text-xs">
                    <span className={cn("font-medium", availabilityStatus.className)}>
                        {availabilityStatus.text}
                    </span>
                </div>

                {/* Цена */}
                <div className="text-sm">
                    {isLoadingPrice ? (
                        <span className="text-gray-500">Расчет цены...</span>
                    ) : priceDetails && isAvailable ? (
                        <div className="flex items-baseline gap-1">
                            <span className="text-gray-600">от</span>
                            <span className="font-bold text-gray-900">
                                {priceDetails.final_total.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-gray-600 text-xs">{t("catalogDesign.periodPrice")}</span>
                        </div>
                    ) : (
                        <span className="text-gray-500 font-medium">Нет доступных</span>
                    )}
                </div>

                {/* Кнопка действия */}
                <div className="pt-1">
                    <MotionButton
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleButtonClick}
                        disabled={!isAvailable}
                        variant={buttonVariant}
                        {...buttonGesture}
                    >
                        {buttonText}
                    </MotionButton>
                </div>
            </div>
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
const CompactPackCard = React.memo(CompactPackCardComponent);

export default CompactPackCard;