import type { MouseEvent } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MoneyText } from '@/components/ui/money-text';
import { CardImage } from '@/components/equipment-card/CardImage';
import { usePackCardViewModel } from '@/hooks/features/usePackCardViewModel';
import { buttonGesture, springs, transitionBase } from '@/lib/motion';
import type { CatalogPackItem } from '@/types/catalog';

const MotionButton = motion.create(Button);

interface PackCardProps { pack: CatalogPackItem; onOpenDetails?: (pack: CatalogPackItem) => void }

export default function PackCard({ pack, onOpenDetails }: PackCardProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const { isAvailable, isAddedToReserve, priceDetails, isLoadingPrice, handleReserveAction } = usePackCardViewModel(pack);
  const statusClass = pack.available_count === 0 ? 'text-reserved-foreground' : pack.available_count === pack.total_count ? 'text-success' : 'text-warning';
  const openDetails = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).closest('button')) onOpenDetails?.(pack);
  };
  return (
    <motion.div
      className="equipment-tile group"
      data-selected={isAddedToReserve}
      onClick={openDetails}
      initial={false}
      animate={{ y: isAddedToReserve && !reducedMotion ? -2 : 0 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      transition={transitionBase}
    >
      <AnimatePresence>
        {isAddedToReserve && (
          <motion.div
            key="selected-badge"
            initial={{ scale: reducedMotion ? 1 : 0, opacity: reducedMotion ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: reducedMotion ? 1 : 0.6, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : springs.pop}
            className="absolute top-3 right-3 z-10 grid place-items-center rounded-full bg-primary p-1 text-primary-foreground shadow-md"
          >
            <Check className="size-4" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
      <CardImage imageUrl={pack.image_url} name={pack.name} selected={isAddedToReserve} />
      <div className="equipment-tile-body">
        <div className="equipment-tile-info">
          <h3><button type="button" className="equipment-tile-title" onClick={() => onOpenDetails?.(pack)}>{pack.name}</button></h3>
          <p>{pack.brand} · {pack.equipment_type}</p>
          <p>{t('catalogDesign.group')}</p>
          <div className="equipment-price">
            {isLoadingPrice ? <span>{t('catalogDesign.priceLoading')}</span> : priceDetails && isAvailable ? <><strong><MoneyText value={priceDetails.final_total} /></strong><span>{t('catalogDesign.periodPrice')}</span></> : <span>{t('catalogDesign.unavailable')}</span>}
          </div>
        </div>
        <div className="mt-auto space-y-3 pt-5">
          <p className={`text-sm font-medium ${statusClass}`}>{t('catalogDesign.availableUnits', { available: pack.available_count, total: pack.total_count })}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenDetails?.(pack)} className="px-0 text-muted-foreground">{t('catalogDesign.groupDetails')}<ArrowRight className="size-4" /></Button>
            <MotionButton variant={isAddedToReserve ? 'default' : 'tonal'} onClick={handleReserveAction} disabled={!isAvailable} aria-pressed={isAddedToReserve} {...buttonGesture}>
              {isAddedToReserve ? <Check className="size-4" /> : <Plus className="size-4" />}{t(isAddedToReserve ? 'catalogDesign.selected' : 'catalogDesign.select')}
            </MotionButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
