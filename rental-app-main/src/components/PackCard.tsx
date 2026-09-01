// src/components/PackCard.tsx

import React, { useMemo } from "react";
import { Package, Image as ImageIcon, Users, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogPackItem } from "@/types/pack";
import { cn } from "@/lib/utils";
import { usePackCardViewModel } from "@/hooks/features/usePackCardViewModel"; // <-- Импортируем новый ViewModel

interface PackCardProps {
    pack: CatalogPackItem;
    onOpenDetails?: (pack: CatalogPackItem) => void;
}

export default function PackCard({ pack, onOpenDetails }: PackCardProps) {
    const { 
        isAvailable,
        priceDetails, 
        isLoadingPrice,
        handleReserveAction,
        buttonText,
        buttonVariant
    } = usePackCardViewModel(pack); // <-- Используем ViewModel

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.(pack);
    };

    // ✅ НОВАЯ ЛОГИКА: Определяем статус и цвет лейбла (как в CompactPackCard)
    const availabilityStatus = useMemo(() => {
        if (pack.available_count === pack.total_count) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "bg-green-100 text-green-800 border-green-200"
            };
        }
        if (pack.available_count > 0) {
            return {
                text: `Доступно: ${pack.available_count} из ${pack.total_count}`,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200" // Желтый для частичной доступности
            };
        }
        return {
            text: `Доступно: 0 из ${pack.total_count}`,
            className: "bg-red-100 text-red-800 border-red-200" // Красный для полной недоступности
        };
    }, [pack.available_count, pack.total_count]);

    return (
        <div
            className="group bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
            onClick={handleCardClick}
        >
            <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-lg">
                {pack.image_url ? (
                    <img
                        src={pack.image_url}
                        alt={pack.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                )}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Пачка оборудования</span>
                    </div>
                    {/* ✅ ПРИМЕНЯЕМ ДИНАМИЧЕСКИЕ КЛАССЫ И ТЕКСТ */}
                    <div className={cn("text-base font-bold px-4 py-1.5 rounded-full border", availabilityStatus.className)}>
                        {availabilityStatus.text}
                    </div>
                </div>

                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {pack.name}
                </h3>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4"/><span>{pack.brand} • {pack.equipment_type}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/><span>{pack.equipment_ids.length} единиц в пачке</span></div>
                </div>
                
                {/* --- БЛОК С ЦЕНОЙ И СКИДКОЙ --- */}
                <div className="text-sm text-gray-500 mb-4 h-12 flex flex-col justify-center border-t border-b py-2">
                    {isLoadingPrice && <span>Расчет цены...</span>}
                    {!isLoadingPrice && priceDetails && isAvailable && (
                        <div className="flex items-baseline gap-2">
                             <DollarSign className="w-4 h-4 text-green-600"/>
                            <span>от <span className="font-bold text-xl text-gray-800">{priceDetails.final_total.toLocaleString('ru-RU')} ₽</span> / в день</span>
                            {priceDetails.discount_amount > 0 && (
                                <span className="text-green-600">
                                    (скидка {priceDetails.discount_amount.toLocaleString('ru-RU')} ₽)
                                </span>
                            )}
                        </div>
                    )}
                     {!isLoadingPrice && !isAvailable && (
                         <span className="font-medium text-gray-500">Нет доступных для резерва</span>
                    )}
                </div>
            </div>

            {/* --- КНОПКА В РЕЗЕРВ --- */}
            <div className="p-4 border-t mt-auto">
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleReserveAction}
                    disabled={!isAvailable}
                    variant={buttonVariant}
                >
                    {buttonText}
                </Button>
            </div>
        </div>
    );
}
