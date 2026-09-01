// path: rental-app-main/src/components/AvailabilityStrip.tsx

import { useState } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import type { DayStatus } from '@/types/availability';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from './ui/button';

interface AvailabilityStripProps {
    dailyStatus?: Record<string, DayStatus>;
    isUnavailable?: boolean;
    // 1. Принимаем новый обработчик
    onSetStartDate: (date: Date) => void;
}

const cellColorMap: Record<string, string> = {
    available: 'bg-green-500 hover:bg-green-600',
    reserved: 'bg-yellow-500 hover:bg-yellow-600',
    rented: 'bg-red-500 hover:bg-red-600',
    default: 'bg-gray-400 hover:bg-gray-500'
};

const grayscaleColorMap: Record<string, string> = {
    available: 'bg-gray-300 hover:bg-gray-400',
    reserved: 'bg-gray-400 hover:bg-gray-500',
    rented: 'bg-gray-500 hover:bg-gray-600',
    default: 'bg-gray-200 hover:bg-gray-300'
};

type PopoverData = {
    date: Date;
    status: string;
};

export default function AvailabilityStrip({ dailyStatus = {}, isUnavailable = false, onSetStartDate }: AvailabilityStripProps) {
    // 2. Вся логика, связанная с useDateStore и useHolidayStore, удалена
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [popoverData, setPopoverData] = useState<PopoverData | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() + i);
        return date;
    });

    const handleCellClick = (date: Date, status: string) => {
        setPopoverData({ date, status });
        setPopoverOpen(true);
    };

    // 3. Обработчик теперь просто вызывает функцию из пропсов
    const handleSetAsStartDate = () => {
        if (!popoverData) return;
        onSetStartDate(popoverData.date);
        setPopoverOpen(false);
    };

    const statusTextMap: Record<string, string> = {
        available: 'Свободно',
        reserved: 'В резерве',
        rented: 'В аренде',
        default: 'Нет данных'
    };

    return (
        <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverAnchor asChild>
                <div
                    className="w-full h-3 mt-auto flex rounded-sm overflow-hidden border border-gray-400 cursor-pointer"
                    title="Посмотреть доступность и выбрать даты"
                >
                    {dates.map(date => {
                        const dateStr = format(date, 'dd.MM.yyyy');
                        const status = dailyStatus[dateStr]?.status ?? 'available';
                        const colorMap = isUnavailable ? grayscaleColorMap : cellColorMap;
                        const color = colorMap[status] ?? colorMap.default;

                        return (
                            <button
                                key={dateStr}
                                className={`flex-1 h-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 z-10 ${color}`}
                                onClick={() => handleCellClick(date, status)}
                                aria-label={`Статус на ${dateStr}: ${statusTextMap[status]}`}
                            />
                        );
                    })}
                </div>
            </PopoverAnchor>

            <PopoverContent
                className="w-auto p-3 bg-white border rounded-md shadow-lg text-sm"
                side="bottom"
                align="center"
                onCloseAutoFocus={(e) => e.preventDefault()}
                sideOffset={5}
            >
                {popoverData && (
                    <div className="space-y-2">
                        <p>
                            <strong>Дата:</strong> {format(popoverData.date, "PPP", { locale: ru })}
                        </p>
                        <p>
                            <strong>Статус:</strong> {statusTextMap[popoverData.status] ?? 'Неизвестно'}
                        </p>
                        {popoverData.status === 'available' && (
                            <Button
                                size="sm"
                                className="mt-2 w-full"
                                onClick={handleSetAsStartDate}
                            >
                                Установить датой начала и добавить в резерв
                            </Button>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}