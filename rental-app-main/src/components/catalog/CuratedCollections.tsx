import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAssociations } from '@/hooks/useAssociations';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import { Button } from '@/components/ui/button';
import type { Equipment } from '@/types/equipment';
import type { Association } from '@/types/association';

interface CuratedCollectionsProps {
  equipment: Equipment[];
}

function collectionImages(association: Association, equipment: Equipment[]) {
  const ids = new Set(association.equipment_ids);
  const seen = new Set<string>();
  const candidates = equipment.filter(item => {
    if (!ids.has(item.id) || !item.image_url || seen.has(item.image_url)) return false;
    seen.add(item.image_url);
    return true;
  });
  const category = (item: Equipment) => {
    if (/фотокамер|видеокамер|экшн/i.test(item.equipment_type)) return 'camera';
    if (/объектив/i.test(item.equipment_type)) return 'lens';
    if (/звук|аудио|микрофон/i.test(item.equipment_type)) return 'audio';
    if (/свет|вспыш|освет/i.test(item.equipment_type)) return 'light';
    if (/штатив|стабилизатор/i.test(item.equipment_type)) return 'support';
    return 'other';
  };
  const name = association.name;
  const priorities = /подкаст|стрим/i.test(name) ? ['audio', 'camera', 'light']
    : /портрет/i.test(name) ? ['lens', 'camera', 'light']
      : /студийный свет/i.test(name) ? ['light', 'support', 'other']
        : /видео|клип|путешеств/i.test(name) ? ['camera', 'support', 'audio', 'light']
          : ['camera', 'lens', 'light', 'audio', 'support'];
  const chosen: Equipment[] = [];
  for (const kind of priorities) {
    const item = candidates.find(candidate => category(candidate) === kind && !chosen.includes(candidate));
    if (item) chosen.push(item);
    if (chosen.length === 3) break;
  }
  return [...chosen, ...candidates.filter(item => !chosen.includes(item))].slice(0, 3);
}

export function CuratedCollections({ equipment }: CuratedCollectionsProps) {
  const { t } = useTranslation();
  const { data: associations = [] } = useAssociations();
  const selectedId = useFilterStore(state => state.associationId);
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const collections = useMemo(() => [...associations]
    .filter(item => item.equipment_ids.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(association => ({ association, images: collectionImages(association, equipment) })), [associations, equipment]);

  const selectCollection = (association: Association) => {
    const store = useFilterStore.getState();
    store.setType(null);
    store.setBrandSystemId(null);
    store.setAssociationId(association.id);
    useSearchStore.getState().setQuery('');
    const target = document.getElementById('equipment-catalog');
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  };

  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * element.clientWidth, behavior: reduced ? 'instant' : 'smooth' });
  };

  if (collections.length === 0) return null;

  return (
    <section className="collection-section" aria-labelledby="collections-heading">
      <div className="collection-heading">
        <div>
          <h2 id="collections-heading" className="text-2xl font-semibold tracking-tight">{t('catalogDesign.collections')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('catalogDesign.collectionsIntro')}</p>
        </div>
        {collections.length > 1 && <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="icon" disabled={edges.start} onClick={() => move(-1)} aria-label={t('catalogDesign.previousCollections')}><ArrowLeft className="size-4" /></Button>
          <Button variant="outline" size="icon" disabled={edges.end} onClick={() => move(1)} aria-label={t('catalogDesign.nextCollections')}><ArrowRight className="size-4" /></Button>
        </div>}
      </div>
      <div ref={rail} className="collection-rail" onScroll={() => {
        const el = rail.current;
        if (el) setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
      }}>
        {collections.map(({ association, images }, index) => (
          <button type="button" key={association.id} className={`collection-card collection-tone-${index % 3}`} onClick={() => selectCollection(association)} aria-pressed={selectedId === association.id}>
            <div className="collection-copy">
              <h3>{association.name}</h3>
              <span className="collection-count">{t('catalogDesign.collectionCount', { count: association.equipment_ids.length })}</span>
            </div>
            {images.length > 0 && <div className="collection-images" aria-hidden="true">
              {images.map((item, imageIndex) => <img key={item.id} src={item.image_url} alt="" className={`collection-image collection-image-${imageIndex}`} loading="lazy" draggable={false} />)}
            </div>}
            <div className="collection-action">
              <span>{t(selectedId === association.id ? 'catalogDesign.collectionSelected' : 'catalogDesign.collectionOpen')}</span>
              {selectedId === association.id ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
