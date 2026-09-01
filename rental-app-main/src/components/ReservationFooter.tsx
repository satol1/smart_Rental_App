// src/components/ReservationFooter.tsx

import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface ReservationFooterProps {
    selectedCount: number;
    onClick: () => void;
    // ✅ Добавляем новое свойство для сброса
    onReset: () => void;
    isEditingMode: boolean;
    intent?: string;
    // ✅ Добавляем даты бронирования
    startDate?: Date;
    endDate?: Date;
}

export default function ReservationFooter({ selectedCount, onClick, onReset, isEditingMode, intent, startDate, endDate }: ReservationFooterProps) {
    if (selectedCount === 0) {
        return null;
    }

    const buttonText = isEditingMode && intent !== "add_to_new_reservation"
        ? `✔️ Добавить к резерву (${selectedCount})`
        : `📥 Оформить (${selectedCount})`;

    // ✅ Форматирование дат для отображения
    const formatDateForDisplay = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    };

    const dateRangeText = startDate && endDate 
        ? `с ${formatDateForDisplay(startDate)} по ${formatDateForDisplay(endDate)}`
        : '';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/90 backdrop-blur-sm border-t border-border shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                
                {/* Блок с текстовой информацией (остается слева) */}
                <div className="text-sm text-foreground">
                    <div className="flex flex-col items-start">
                        <div>
                            <span className="font-semibold">Выбрано для резерва:</span>
                            <span className="ml-2 font-bold text-lg">{selectedCount} поз.</span>
                        </div>
                        {dateRangeText && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {dateRangeText}
                            </div>
                        )}
                    </div>
                </div>

                {/* Блок с кнопками (теперь обе кнопки здесь) */}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <Button
                        onClick={onReset}
                        variant="destructive"
                        size="lg"
                        className="flex items-center gap-2 order-last sm:order-first"
                    >
                        <X className="h-5 w-5" />
                        Сбросить выбор
                    </Button>
                    <Button
                        onClick={onClick}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center gap-2"
                    >
                        {buttonText}
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                </div>

            </div>
        </div>
    );
}