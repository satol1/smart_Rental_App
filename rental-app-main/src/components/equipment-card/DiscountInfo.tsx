// src/components/equipment-card/DiscountInfo.tsx
import React from 'react';
import { MoneyText } from '@/components/ui/money-text';
import { getDayEnding } from './constants';

interface DiscountInfoProps {
    days: number;
    percentage: number;
    priceBefore: number;
    priceAfter: number;
}

export const DiscountInfo: React.FC<DiscountInfoProps> = ({ days, percentage, priceBefore, priceAfter }) => (
    <div className="mt-2 p-2 bg-muted rounded-md border border-dashed">
        <div className="flex justify-between items-center text-sm">
            <span>{days} {getDayEnding(days)}:</span>
            {percentage > 0 ? (
                <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground line-through"><MoneyText value={Math.round(priceBefore)} /></span>
                    <span className="font-bold text-base text-success"><MoneyText value={Math.round(priceAfter)} /></span>
                </div>
            ) : (
                <span className="font-bold text-base text-foreground"><MoneyText value={Math.round(priceBefore)} /></span>
            )}
        </div>
        {percentage > 0 && <div className="text-xs text-right text-muted-foreground">Скидка {percentage}%</div>}
    </div>
);