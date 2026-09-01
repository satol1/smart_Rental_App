// path: rental-app-main/src/components/equipment-card/CardFooter.tsx

import React from 'react';
import AvailabilityStrip from "@/components/AvailabilityStrip";
import { STATUS_TEXT_STYLES, STATUS_TEXTS } from './constants';
import type { DayStatus, EquipmentStatus } from "@/types/availability";

interface CardFooterProps {
    status: EquipmentStatus | "my_reservation" | "added";
    dateRange: string;
    selected: boolean;
    onToggleSelection: (e: React.MouseEvent) => void;
    isUnavailable?: boolean;
    dailyStatus?: Record<string, DayStatus>;
    // 1. Добавляем новый проп
    onSetStartDate: (date: Date) => void;
}

export const CardFooter: React.FC<CardFooterProps> = ({
    status, dateRange, selected, onToggleSelection, isUnavailable, dailyStatus, onSetStartDate
}) => (
    <div className="mt-auto pt-4 space-y-2">
        <div className="flex justify-between items-center">
            <p className={`text-sm font-semibold ${STATUS_TEXT_STYLES[status]}`}>
                {STATUS_TEXTS[status]}
                {dateRange && <span className="ml-1 text-xs font-normal">{dateRange}</span>}
            </p>
            {(status === 'available' || status === 'added') && (
                <button
                    onClick={onToggleSelection}
                    disabled={isUnavailable}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                        isUnavailable
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : status === 'added'
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : selected
                                    ? "bg-sky-700 text-white hover:bg-sky-800"
                                    : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                    }`}
                >
                    {isUnavailable ? "Недоступно" : (status === 'added' ? "Отменить" : (selected ? "✔ В резерве" : "➕ В резерв"))}
                </button>
            )}
        </div>
        {/* 2. Передаем новый проп в AvailabilityStrip */}
        <AvailabilityStrip 
            dailyStatus={dailyStatus} 
            isUnavailable={isUnavailable}
            onSetStartDate={onSetStartDate}
        />
    </div>
);