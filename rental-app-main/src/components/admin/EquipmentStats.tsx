// src/components/admin/EquipmentStats.tsx
import { useMemo } from 'react';
import { MoneyText } from "@/components/ui/money-text";
import type { Equipment } from "@/types/equipment";

interface Props {
    equipment: Equipment[];
}

export const EquipmentStats = ({ equipment }: Props) => {
    const stats = useMemo(() => {
        const totalCount = equipment.length;
        if (totalCount === 0) {
            return { totalCount: 0, typesCount: 0, brandsCount: 0, avgRate: 0 };
        }
        return {
            totalCount,
            typesCount: new Set(equipment.map(item => item.equipment_type)).size,
            brandsCount: new Set(equipment.map(item => item.brand)).size,
            avgRate: Math.round(equipment.reduce((sum, item) => sum + item.daily_rate, 0) / totalCount),
        };
    }, [equipment]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalCount}</div>
                <div className="text-sm text-muted-foreground">Всего единиц</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold">{stats.typesCount}</div>
                <div className="text-sm text-muted-foreground">Типов</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold">{stats.brandsCount}</div>
                <div className="text-sm text-muted-foreground">Брендов</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold"><MoneyText value={stats.avgRate} /></div>
                <div className="text-sm text-muted-foreground">Средний тариф</div>
            </div>
        </div>
    );
};