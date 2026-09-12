// path: rental-app-main/src/components/calendar/CalendarEventDetailsModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, User, Package, ArrowRight } from "lucide-react";
import FinancialInfoBlock from "@/components/shared/FinancialInfoBlock";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";

import type { AccessoryLink, CalendarEventOrder } from "@/types/reservation";

// Унифицированный тип для данных события
export interface CalendarEventDetails {
    order: CalendarEventOrder; // Поддерживаем как полные, так и публичные данные
    orderType: 'reservation' | 'rental';
    isOwner?: boolean;
    hasExtendedAccess?: boolean;
}

interface CalendarEventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventData: CalendarEventDetails | null;
    onNavigateToOrder: (orderType: 'reservation' | 'rental', orderId: number, userId: number) => void;
}

export default function CalendarEventDetailsModal({
    isOpen,
    onClose,
    eventData,
    onNavigateToOrder
}: CalendarEventDetailsModalProps) {
    if (!eventData) return null;

    const { order, orderType, isOwner, hasExtendedAccess } = eventData;

    const handleNavigate = () => {
        // Для публичных данных у нас может не быть userId
        const userId = 'user' in order ? order.user?.id : order.user_info?.id;
        if (hasExtendedAccess && userId) {
            onNavigateToOrder(orderType, order.id, userId);
        }
        onClose();
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {orderType === 'reservation' ? 'Резерв' : 'Аренда'} #{order.id}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {hasExtendedAccess && ('user' in order ? order.user?.full_name : order.user_info?.full_name) ? (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{'user' in order ? order.user?.full_name : order.user_info?.full_name}</span>
                            </div>
                        ) : isOwner ? (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-primary font-medium">
                                    {orderType === 'reservation' ? 'Мой резерв' : 'Моя аренда'}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Информация недоступна</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{formatDate(order.start_date)} - {formatDate(order.end_date)}</span>
                        </div>
                    </div>

                    {/* Информация об оборудовании */}
                    <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Оборудование
                        </h4>
                        {order.equipment_name ? (
                            <div className="pl-6 space-y-1">
                                <div><strong>Название:</strong> {order.equipment_name}</div>
                                {order.equipment_type && <div><strong>Тип:</strong> {order.equipment_type}</div>}
                                {order.equipment_brand && <div><strong>Бренд:</strong> {order.equipment_brand}</div>}
                            </div>
                        ) : hasExtendedAccess && 'equipment' in order ? (
                            <EquipmentWithAccessoriesList
                                equipment={order.equipment ?? []}
                                accessoryLinks={order.accessory_links as AccessoryLink[]}
                                title=""
                                showTitle={false}
                            />
                        ) : (
                            <div className="pl-6 text-muted-foreground">Информация недоступна</div>
                        )}
                    </div>

                    {/* Финансовая информация - только для авторизованных пользователей */}
                    {hasExtendedAccess && order.total_cost !== undefined && (
                        <FinancialInfoBlock
                            totalCost={order.total_cost}
                            discountAmount={order.discount_amount}
                            promoCode={order.promo_code}
                            variant="admin"
                        />
                    )}

                    {/* Кнопка навигации - только для авторизованных пользователей с расширенным доступом */}
                    {hasExtendedAccess && ('user' in order ? order.user?.id : order.user_info?.id) && (
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={handleNavigate} className="flex items-center gap-2">
                                Перейти к заказу
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
