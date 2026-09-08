import type { MouseEvent } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CardImage } from '@/components/equipment-card/CardImage';
import { usePackCardViewModel } from '@/hooks/features/usePackCardViewModel';
import type { CatalogPackItem } from '@/types/pack';

interface PackCardProps { pack: CatalogPackItem; onOpenDetails?: (pack: CatalogPackItem) => void }

export default function PackCard({ pack, onOpenDetails }: PackCardProps) {
  const { t } = useTranslation();
  const { isAvailable, isAddedToReserve, priceDetails, isLoadingPrice, handleReserveAction } = usePackCardViewModel(pack);
  const statusClass = pack.available_count === 0 ? 'text-destructive' : pack.available_count === pack.total_count ? 'text-success' : 'text-warning';
  const openDetails = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).closest('button')) onOpenDetails?.(pack);
  };
  return (
    <div className="equipment-tile group" data-selected={isAddedToReserve} onClick={openDetails}>
      <CardImage imageUrl={pack.image_url} name={pack.name} />
      <div className="equipment-tile-body">
        <div className="equipment-tile-info">
          <h3><button type="button" className="equipment-tile-title" onClick={() => onOpenDetails?.(pack)}>{pack.name}</button></h3>
          <p>{pack.brand} · {pack.equipment_type}</p>
          <p>{t('catalogDesign.group')}</p>
          <div className="equipment-price">
            {isLoadingPrice ? <span>{t('catalogDesign.priceLoading')}</span> : priceDetails && isAvailable ? <><strong>{priceDetails.final_total.toLocaleString('ru-RU')} ₽</strong><span>{t('catalogDesign.periodPrice')}</span></> : <span>{t('catalogDesign.unavailable')}</span>}
          </div>
        </div>
        <div className="mt-auto space-y-3 pt-5">
          <p className={`text-sm font-medium ${statusClass}`}>{t('catalogDesign.availableUnits', { available: pack.available_count, total: pack.total_count })}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenDetails?.(pack)} className="px-0 text-muted-foreground">{t('catalogDesign.groupDetails')}<ArrowRight className="size-4" /></Button>
            <Button variant={isAddedToReserve ? 'default' : 'tonal'} onClick={handleReserveAction} disabled={!isAvailable} aria-pressed={isAddedToReserve}>
              {isAddedToReserve ? <Check className="size-4" /> : <Plus className="size-4" />}{t(isAddedToReserve ? 'catalogDesign.selected' : 'catalogDesign.select')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
