import { SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SearchInput from '@/components/SearchInput';
import AvailableCheckbox from '@/components/AvailableCheckbox';
import GroupSimilarCheckbox from '@/components/GroupSimilarCheckbox';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '@/store/filterStore';
import { useSearchStore } from '@/store/searchStore';
import type { Association } from '@/types/association';

interface FilterPanelProps {
  availableTypes: string[];
  availableBrands: Array<{ id: number; name: string }>;
  availableAssociations: Association[];
  hasActiveFilters: boolean;
}

export default function FilterPanel({ availableTypes, availableBrands, availableAssociations }: FilterPanelProps) {
  const { t } = useTranslation();
  const filters = useFilterStore();
  const query = useSearchStore(state => state.query);
  const activeCount = [filters.type, filters.brandSystemId, filters.associationId, filters.availableOnly, query.trim()].filter(Boolean).length;
  const priority = (type: string) => /фотокамер/i.test(type) ? 0 : /объектив/i.test(type) ? 1 : /видеокамер/i.test(type) ? 2 : /студийный свет/i.test(type) ? 3 : /звук/i.test(type) ? 4 : 5;
  const types = [...availableTypes].sort((a, b) => priority(a) - priority(b));
  if (filters.type && !types.includes(filters.type)) types.unshift(filters.type);
  const clear = () => { filters.reset(); useSearchStore.getState().setQuery(''); };

  return (
    <div className="catalog-filters rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="catalog-filter-bar">
        <SearchInput />
        <div className="catalog-filter-controls">
          <AvailableCheckbox />
          <GroupSimilarCheckbox />
          {activeCount > 0 && <Button variant="ghost" size="icon" onClick={clear} aria-label={t('catalogDesign.reset')}><X className="size-4" /></Button>}
        </div>
      </div>
      <div className="catalog-filter-row">
        <span className="catalog-filter-label"><SlidersHorizontal className="size-4" aria-hidden="true" />{t('catalogDesign.category')}</span>
        <div className="catalog-filter-options" role="group" aria-label={t('catalogDesign.category')}>
          <button type="button" className="catalog-chip" aria-pressed={!filters.type} onClick={() => filters.setType(null)}>{t('catalogDesign.allCategories')}</button>
          {types.map(type => <button type="button" key={type} className="catalog-chip" aria-pressed={filters.type === type} onClick={() => filters.setType(filters.type === type ? null : type)}>{type}</button>)}
        </div>
      </div>
      <div className="catalog-filter-row">
        <span className="catalog-filter-label">{t('catalogDesign.brand')}</span>
        <div className="catalog-filter-options" role="group" aria-label={t('catalogDesign.brand')}>
          <button type="button" className="catalog-chip" aria-pressed={!filters.brandSystemId} onClick={() => filters.setBrandSystemId(null)}>{t('catalogDesign.allBrands')}</button>
          {availableBrands.map(brand => <button type="button" key={brand.id} className="catalog-chip" aria-pressed={filters.brandSystemId === brand.id} onClick={() => filters.setBrandSystemId(filters.brandSystemId === brand.id ? null : brand.id)}>{brand.name}</button>)}
        </div>
      </div>
      <div className="catalog-filter-row">
        <span className="catalog-filter-label">{t('catalogDesign.collection')}</span>
        <div className="catalog-filter-options" role="group" aria-label={t('catalogDesign.collection')}>
          <button type="button" className="catalog-chip" aria-pressed={!filters.associationId} onClick={() => filters.setAssociationId(null)}>{t('catalogDesign.allCollections')}</button>
          {availableAssociations.map(association => <button type="button" key={association.id} className="catalog-chip" aria-pressed={filters.associationId === association.id} onClick={() => filters.setAssociationId(filters.associationId === association.id ? null : association.id)}>{association.name}</button>)}
        </div>
      </div>
    </div>
  );
}