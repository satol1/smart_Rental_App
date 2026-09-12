// src/components/rental/MyRentalCard.tsx

import React, { useState, forwardRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { MoneyText } from "@/components/ui/money-text";
import { CalendarRange, Truck, ExternalLink, ChevronDown, Paperclip, Tag, ReceiptText, Clock, AlertTriangle } from "lucide-react";
import { formatDateEuropean, calculateDaysOverdue } from "@/lib/utils";
import { useRentalToReservationNavigation } from "@/hooks/useRentalToReservationNavigation";
import type { AdminRentalOut } from "@/types/rental";

interface MyRentalCardProps {
    rental: AdminRentalOut;
    highlightClasses?: string;
}

const MyRentalCard = forwardRef<HTMLDivElement, MyRentalCardProps>(({ rental, highlightClasses = '' }, ref) => {
    const [expandedAccessories, setExpandedAccessories] = useState<Record<number, boolean>>({});
    const { navigateToReservation } = useRentalToReservationNavigation({ context: 'user' });

    const toggleAccessories = useCallback((equipmentId: number) => {
        setExpandedAccessories(prev => ({
            ...prev,
            [equipmentId]: !prev[equipmentId]
        }));
    }, []);


    const start = rental.start_date ? new Date(rental.start_date) : null;
    const end = rental.end_date ? new Date(rental.end_date) : null;
    const actualReturn = rental.actual_return_date ? new Date(rental.actual_return_date) : null;

    const handleReservationClick = useCallback(() => {
        if (rental.reservation_id) {
            navigateToReservation(rental.reservation_id);
        }
    }, [rental.reservation_id, navigateToReservation]);

    // Логика для стилизации карточки в зависимости от статуса


    return (
        <Card
            ref={ref}
            className={`p-5 space-y-4 bg-card ${highlightClasses}`}
        >
            {/* Заголовок с ID и статусом */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">
                        Аренда #{rental.id}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={rental.status} />
                    {/* Ссылка на резерв */}
                    {rental.reservation_id && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReservationClick}
                            className="text-primary hover:text-primary hover:bg-info-soft border-primary/20"
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Резерв #{rental.reservation_id}
                        </Button>
                    )}
                </div>
            </div>

            {/* Даты */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="w-4 h-4" />
                <span>
                    {start && end && (
                        <>
                            {formatDateEuropean(start)} - {formatDateEuropean(end)}
                        </>
                    )}
                </span>
            </div>

            {/* Фактическая дата возврата */}
            {actualReturn && (
                <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Возврат:</span> {formatDateEuropean(actualReturn)}
                </div>
            )}

            {/* Состав аренды */}
            <div className="space-y-2 pt-3 border-t">
                <h4 className="font-medium text-sm text-foreground">Состав аренды:</h4>
                <div className="space-y-2">
                    {rental.equipment.map((item) => {
                        const accessoriesForItem = rental.accessory_links?.filter(link => link.equipment_id === item.id);
                        return (
                            <div key={item.id} className="text-sm text-foreground border-b border-border py-3">
                                <p>• {item.name}</p>
                                {accessoriesForItem && accessoriesForItem.length > 0 && (
                                    <div className="mt-2 pl-4">
                                        <button aria-expanded={!!expandedAccessories[item.id]} onClick={() => toggleAccessories(item.id)} className="flex items-center text-xs text-primary hover:underline font-medium">
                                            <Paperclip className="w-3 h-3 mr-1" />
                                            Аксессуары ({accessoriesForItem.length})
                                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedAccessories[item.id] ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedAccessories[item.id] && (
                                            <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 pl-2 ">
                                                {accessoriesForItem.map(link => (
                                                    <li key={link.accessory.id}>{link.accessory.name}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Финансовый блок с таймером */}
            <div className="flex items-start justify-between pt-3 border-t flex-wrap-reverse gap-4">
                {/* Финансовый блок */}
                <div className="text-xs space-y-1.5 text-foreground flex-grow">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2"><ReceiptText className="w-4 h-4"/>Финансы</h4>
                    <div className="flex justify-between gap-4"><span>Стоимость аренды:</span> <span className="font-medium"><MoneyText value={rental.total_cost} /></span></div>
                    {rental.discount_amount > 0 && (
                        <div className="flex justify-between gap-4 text-success"><span>Скидка:</span> <span className="font-medium">- <MoneyText value={rental.discount_amount} /></span></div>
                    )}
                    {rental.promo_code && (
                        <div className="flex justify-between items-center gap-4 text-primary"><span>Промокод:</span> <span className="font-medium flex items-center gap-1"><Tag className="w-3 h-3"/>{rental.promo_code}</span></div>
                    )}
                    {(rental.overdue_surcharge ?? 0) > 0 && (
                        <div className="flex justify-between gap-4 text-destructive font-bold pt-1 border-t mt-1"><span>Доплата за просрочку:</span> <span><MoneyText value={rental.overdue_surcharge} /></span></div>
                    )}
                </div>

                {/* Таймер статуса */}
                {(() => {
                    if (rental.status === 'overdue') {
                        const daysOverdue = calculateDaysOverdue(rental.end_date, rental.overdue_days);
                        return (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-destructive bg-danger-soft/60 border-destructive/20">
                                <AlertTriangle className="w-4 h-4"/>
                                {`Просрочена на ${daysOverdue} дн.`}
                            </div>
                        );
                    }
                    if (rental.status === 'active' && rental.days_remaining != null) {
                        const daysLeft = rental.days_remaining;
                        if (daysLeft <= 1) {
                            return (
                                <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-warning bg-warning-soft/60 border-warning/20">
                                    <Clock className="w-4 h-4"/>
                                    {`Остался ${daysLeft} день`}
                                </div>
                            );
                        }
                        return (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-success bg-success-soft/60 border-success/20">
                                <Clock className="w-4 h-4"/>
                                {`Осталось ${daysLeft} дн.`}
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>


            {/* Заметки */}
            {rental.notes_on_issue && (
                <div className="pt-2 border-t">
                    <div className="text-sm">
                        <span className="font-medium text-foreground">Заметки при выдаче:</span>
                        <p className="text-muted-foreground mt-1">{rental.notes_on_issue}</p>
                    </div>
                </div>
            )}

            {rental.notes_on_return && (
                <div className="pt-2 border-t">
                    <div className="text-sm">
                        <span className="font-medium text-foreground">Заметки при возврате:</span>
                        <p className="text-muted-foreground mt-1">{rental.notes_on_return}</p>
                    </div>
                </div>
            )}
        </Card>
    );
});

MyRentalCard.displayName = 'MyRentalCard';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(MyRentalCard);
