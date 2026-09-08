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
import { STATUS_CONFIG } from "@/constants/statusConstants";

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
    const statusClass = STATUS_CONFIG[rental.status]?.badgeClass || "bg-white hover:shadow-md";

    return (
        <Card 
            ref={ref}
            className={`p-4 space-y-4 transition-all duration-300 ${statusClass} ${highlightClasses}`}
        >
            {/* Заголовок с ID и статусом */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
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
                            className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Резерв #{rental.reservation_id}
                        </Button>
                    )}
                </div>
            </div>

            {/* Даты */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                <div className="text-sm text-gray-600">
                    <span className="font-medium">Возврат:</span> {formatDateEuropean(actualReturn)}
                </div>
            )}

            {/* Состав аренды */}
            <div className="space-y-2 pt-3 border-t">
                <h4 className="font-medium text-sm text-gray-800">Состав аренды:</h4>
                <div className="space-y-2">
                    {rental.equipment.map((item) => {
                        const accessoriesForItem = rental.accessory_links?.filter(link => link.equipment_id === item.id);
                        return (
                            <div key={item.id} className="text-sm text-gray-700 bg-gray-50/70 p-2 rounded-md border">
                                <p>• {item.name}</p>
                                {accessoriesForItem && accessoriesForItem.length > 0 && (
                                    <div className="mt-2 pl-4">
                                        <button onClick={() => toggleAccessories(item.id)} className="flex items-center text-xs text-sky-700 hover:underline font-medium">
                                            <Paperclip className="w-3 h-3 mr-1" />
                                            Аксессуары ({accessoriesForItem.length})
                                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedAccessories[item.id] ? 'rotate-180' : ''}`} />
                                        </button>
                                        {expandedAccessories[item.id] && (
                                            <ul className="list-disc list-inside text-xs text-gray-600 mt-1 pl-2 animate-in fade-in duration-200">
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
                <div className="text-xs space-y-1.5 text-slate-700 flex-grow">
                    <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2 mb-2"><ReceiptText className="w-4 h-4"/>Финансы</h4>
                    <div className="flex justify-between gap-4"><span>Стоимость аренды:</span> <span className="font-medium"><MoneyText value={rental.total_cost} /></span></div>
                    {rental.discount_amount > 0 && (
                        <div className="flex justify-between gap-4 text-green-600"><span>Скидка:</span> <span className="font-medium">- <MoneyText value={rental.discount_amount} /></span></div>
                    )}
                    {rental.promo_code && (
                        <div className="flex justify-between items-center gap-4 text-purple-600"><span>Промокод:</span> <span className="font-medium flex items-center gap-1"><Tag className="w-3 h-3"/>{rental.promo_code}</span></div>
                    )}
                    {rental.overdue_surcharge && rental.overdue_surcharge > 0 && (
                        <div className="flex justify-between gap-4 text-red-600 font-bold pt-1 border-t border-dashed mt-1"><span>Доплата за просрочку:</span> <span><MoneyText value={rental.overdue_surcharge} /></span></div>
                    )}
                </div>
                
                {/* Таймер статуса */}
                {(() => {
                    if (rental.status === 'overdue') {
                        const daysOverdue = calculateDaysOverdue(rental.end_date, rental.overdue_days);
                        return (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-red-600 bg-red-100/60 border-red-200">
                                <AlertTriangle className="w-4 h-4"/>
                                {`Просрочена на ${daysOverdue} дн.`}
                            </div>
                        );
                    }
                    if (rental.status === 'active' && rental.days_remaining !== null) {
                        const daysLeft = rental.days_remaining;
                        if (daysLeft <= 1) {
                            return (
                                <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-orange-600 bg-orange-100/60 border-orange-200">
                                    <Clock className="w-4 h-4"/>
                                    {`Остался ${daysLeft} день`}
                                </div>
                            );
                        }
                        return (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-green-700 bg-green-100/60 border-green-200">
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
                        <span className="font-medium text-gray-700">Заметки при выдаче:</span>
                        <p className="text-gray-600 mt-1">{rental.notes_on_issue}</p>
                    </div>
                </div>
            )}

            {rental.notes_on_return && (
                <div className="pt-2 border-t">
                    <div className="text-sm">
                        <span className="font-medium text-gray-700">Заметки при возврате:</span>
                        <p className="text-gray-600 mt-1">{rental.notes_on_return}</p>
                    </div>
                </div>
            )}
        </Card>
    );
});

MyRentalCard.displayName = 'MyRentalCard';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(MyRentalCard);
