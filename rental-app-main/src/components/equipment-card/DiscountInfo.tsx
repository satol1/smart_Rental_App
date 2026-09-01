// src/components/equipment-card/DiscountInfo.tsx
import React from 'react';
import { getDayEnding } from './constants';

interface DiscountInfoProps {
    days: number;
    percentage: number;
    priceBefore: number;
    priceAfter: number;
}

export const DiscountInfo: React.FC<DiscountInfoProps> = ({ days, percentage, priceBefore, priceAfter }) => (
    <div className="mt-2 p-2 bg-gray-50 rounded-md border border-dashed">
        <div className="flex justify-between items-center text-sm">
            <span>{days} {getDayEnding(days)}:</span>
            {percentage > 0 ? (
                <div className="flex items-baseline gap-2">
                    <span className="text-gray-500 line-through">{Math.round(priceBefore).toLocaleString('ru-RU')} ₽</span>
                    <span className="font-bold text-base text-green-600">{Math.round(priceAfter).toLocaleString('ru-RU')} ₽</span>
                </div>
            ) : (
                <span className="font-bold text-base text-gray-800">{Math.round(priceBefore).toLocaleString('ru-RU')} ₽</span>
            )}
        </div>
        {percentage > 0 && <div className="text-xs text-right text-gray-500">Скидка {percentage}%</div>}
    </div>
);