// src/components/CompactPackCard.tsx

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogPackItem } from "@/types/pack";
import { usePackCardViewModel } from "@/hooks/features/usePackCardViewModel";

interface CompactPackCardProps {
    pack: CatalogPackItem;
    onOpenDetails?: (pack: CatalogPackItem) => void;
}

const CompactPackCardComponent: React.FC<CompactPackCardProps> = ({ 
    pack, 
    onOpenDetails 
}) => {
    const { t } = useTranslation();
    // Переиспользуем всю бизнес-логику из ViewModel
    const { 
        isAvailable,
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
            className: "text-red-600"
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
        return "bg-red-50 border-red-200 hover:bg-red-100"; // Красный для недоступности
    }, [pack.available_count, pack.total_count]);

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
                "relative h-full p-4 rounded-xl border transition-colors duration-200 cursor-pointer",
                cardBackgroundClass
            )}
            onClick={handleCardClick}
        >
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
                    <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleButtonClick}
                        disabled={!isAvailable}
                        variant={buttonVariant}
                    >
                        {buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
const CompactPackCard = React.memo(CompactPackCardComponent);

export default CompactPackCard;