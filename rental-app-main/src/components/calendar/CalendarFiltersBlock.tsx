import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterX, Search } from 'lucide-react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  availableTypes: string[];
  availableBrands: string[];
  typeFilter: string | null;
  setTypeFilter: (v: string | null) => void;
  brandFilter: string | null;
  setBrandFilter: (v: string | null) => void;
  searchText: string;
  setSearchText: (v: string) => void;
  onReset: () => void;
};

export default function CalendarFiltersBlock({ availableTypes, availableBrands, typeFilter, setTypeFilter, brandFilter, setBrandFilter, searchText, setSearchText, onReset }: Props) {
  const { t } = useTranslation();
  const searchId = useId();
  const filters = [
    { label: t('shell.equipmentType'), options: availableTypes, selected: typeFilter, onSelect: setTypeFilter },
    { label: t('shell.brand'), options: availableBrands, selected: brandFilter, onSelect: setBrandFilter },
  ];

  return (
    <div className="mb-6 space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5 print:hidden">
      <div className="grid items-end gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(20rem,1.3fr)_auto]">
        <div>
          <label htmlFor={searchId} className="mb-2 block text-sm font-medium text-muted-foreground">{t('shell.searchEquipment')}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id={searchId} type="search" placeholder={t('shell.searchPlaceholder')} value={searchText} onChange={(event) => setSearchText(event.target.value)} className="pl-10" />
          </div>
        </div>
        <CalendarDateInputRange className="max-w-none" />
        <Button variant="ghost" onClick={onReset} className="justify-self-start text-muted-foreground lg:justify-self-end">
          <FilterX className="h-4 w-4" aria-hidden="true" />{t('shell.resetFilters')}
        </Button>
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        {filters.map(({ label, options, selected, onSelect }) => (
          <div key={label} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4" role="group" aria-label={label}>
            <span className="text-sm font-medium text-muted-foreground sm:w-24 sm:shrink-0 sm:pt-3">{label}</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="filter" data-state={selected === null ? 'on' : 'off'} aria-pressed={selected === null} onClick={() => onSelect(null)}>{t('shell.all')}</Button>
              {options.map((option) => (
                <Button key={option} variant="filter" data-state={selected === option ? 'on' : 'off'} aria-pressed={selected === option} onClick={() => onSelect(option)}>{option}</Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
