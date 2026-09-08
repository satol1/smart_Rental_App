import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Paperclip, ChevronDown, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MoneyText, formatMoney } from '@/components/ui/money-text';
import { buttonGesture } from '@/lib/motion';
import type { Equipment } from '@/types/equipment';
import type { AvailabilityInfo } from '@/types/availability';
import { cn, formatDateRangeEuropean } from '@/lib/utils';

const MotionButton = motion.create(Button);

type Props = {
    equipment: Equipment;
    availability?: AvailabilityInfo;
    onRemove: (id: number) => void;
    isAccessorySelected: (equipmentId: number, accessoryId: number) => boolean;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
};

const statusKeys: Record<string, string> = {
    available: 'available', reserved: 'reserved', rented: 'rented', my_reservation: 'myReservation',
};

export default function ReserveEquipmentCard({ equipment, availability, onRemove, isAccessorySelected, onToggleAccessory }: Props) {
    const { t } = useTranslation();
    const accessoriesId = useId();
    const [showAccessories, setShowAccessories] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const status = availability?.status ?? 'available';
    const hasConflict = status === 'reserved' || status === 'rented';
    const dateRange = hasConflict && availability?.start_date && availability?.end_date
        ? formatDateRangeEuropean(availability.start_date, availability.end_date) : '';
    const image = equipment.image_url || equipment.image_urls?.[0];
    return (
        <div className="w-full min-w-0 p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background sm:h-24 sm:w-24">
                    {image && !imageFailed ? (
                        <img src={image} alt="" onError={() => setImageFailed(true)} className="h-full w-full object-contain p-2" loading="lazy" />
                    ) : <Camera className="h-7 w-7 text-muted-foreground" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs text-muted-foreground">{equipment.brand} · {equipment.equipment_type}</p>
                    <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{equipment.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t('ordersDesign.condition')}: {equipment.condition}</p>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                        {t('ordersDesign.dailyRate', { amount: formatMoney(equipment.daily_rate) })}
                    </p>
                </div>
                <MotionButton type="button" variant="ghost" size="icon" onClick={() => onRemove(equipment.id)}
                    aria-label={t('ordersDesign.removeEquipment', { name: equipment.name })}
                    className="shrink-0 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                    {...buttonGesture}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </MotionButton>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className={cn('rounded-md px-2 py-1 font-medium', hasConflict ? 'bg-reserved-soft text-reserved-foreground' : 'bg-success-soft text-success')}>
                    {t('ordersDesign.' + (statusKeys[status] || 'unknownStatus'))}
                </span>
                {dateRange && <span className="text-muted-foreground">{dateRange}</span>}
            </div>
            {equipment.accessories?.length > 0 && (
                <div className="mt-4 border-t border-border pt-2">
                    <Button type="button" variant="ghost" aria-expanded={showAccessories} aria-controls={accessoriesId}
                        onClick={() => setShowAccessories(value => !value)} className="w-full justify-between px-0 hover:bg-transparent">
                        <span className="flex items-center gap-2"><Paperclip className="h-4 w-4" aria-hidden="true" />{t('ordersDesign.addAccessories', { count: equipment.accessories.length })}</span>
                        <ChevronDown className={cn('h-4 w-4', showAccessories && 'rotate-180')} aria-hidden="true" />
                    </Button>
                    {showAccessories && (
                        <div id={accessoriesId} className="mt-1 divide-y divide-border">
                            {equipment.accessories.map(accessory => (
                                <div key={accessory.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                                    <Label htmlFor={accessoriesId + '-' + accessory.id} className="flex min-w-0 cursor-pointer items-center gap-3 text-sm font-normal leading-snug">
                                        <Checkbox id={accessoriesId + '-' + accessory.id} checked={isAccessorySelected(equipment.id, accessory.id)}
                                            onCheckedChange={() => onToggleAccessory(equipment.id, accessory.id)} />
                                        <span className="break-words">{accessory.name}</span>
                                    </Label>
                                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground"><MoneyText value={accessory.price} /></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
