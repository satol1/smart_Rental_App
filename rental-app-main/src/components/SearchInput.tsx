import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchStore } from '@/store/searchStore';
import { Input } from '@/components/ui/input';

export default function SearchInput() {
  const { query, setQuery } = useSearchStore();
  const { t } = useTranslation();
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('catalogDesign.searchPlaceholder')} aria-label={t('catalogDesign.search')} className="w-full bg-card pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden" />
      {query && <button type="button" onClick={() => setQuery('')} className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('catalogDesign.clearSearch')}><X className="size-4" /></button>}
    </div>
  );
}