import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useOrderFilterStore, type SortOption, type OrderContext } from '@/store/orderFilterStore';
import { isHideCompletedFilterActive } from '@/lib/filterUtils';

interface OrderToolbarProps {
    context: OrderContext;
    showHideCompletedCheckbox?: boolean;
    embedded?: boolean;
}

const sortOptions: Array<[SortOption, string]> = [
    ['id_desc', 'sortIdDesc'], ['id_asc', 'sortIdAsc'],
    ['start_asc', 'sortStartAsc'], ['start_desc', 'sortStartDesc'],
    ['end_asc', 'sortEndAsc'], ['end_desc', 'sortEndDesc'],
    ['count_desc', 'sortCountDesc'], ['count_asc', 'sortCountAsc'],
];

export default function OrderToolbar({ context, showHideCompletedCheckbox, embedded = false }: OrderToolbarProps) {
    const { t } = useTranslation();
    const id = useId();
    const { searchQuery, statusFilter, sortOption, setSearchQuery, setStatusFilter, setSortOption, getDefaultStatusFilter } = useOrderFilterStore();
    useEffect(() => {
        const defaultFilter = getDefaultStatusFilter(context);
        if (!statusFilter || statusFilter === 'hide-completed') setStatusFilter(defaultFilter);
    }, [context, statusFilter, setStatusFilter, getDefaultStatusFilter]);

    const statuses = context.endsWith('rentals') ? ['active', 'overdue', 'completed', 'all'] : ['active', 'completed', 'all'];
    return (
        <div role="group" aria-label={t('ordersDesign.filters')} className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_220px] ${embedded ? '' : 'border-y border-border py-5'}`}>
            <div className="min-w-0 space-y-2">
                <Label htmlFor={id + '-search'}>{t('ordersDesign.search')}</Label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id={id + '-search'} type="search"
                        placeholder={t(context.startsWith('admin') ? 'ordersDesign.searchClient' : 'ordersDesign.searchEquipment')}
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
            </div>
            {showHideCompletedCheckbox ? (
                <div className="flex min-h-11 items-center gap-3 self-end sm:pb-0 lg:px-3">
                    <Checkbox id={id + '-hide'} checked={isHideCompletedFilterActive(statusFilter)}
                        onCheckedChange={checked => setStatusFilter(checked === true ? 'hide-completed' : 'all')} />
                    <Label htmlFor={id + '-hide'} className="cursor-pointer font-normal">{t('ordersDesign.hideCompleted')}</Label>
                </div>
            ) : (
                <div className="min-w-0 space-y-2">
                    <Label htmlFor={id + '-status'}>{t('ordersDesign.status')}</Label>
                    <Select value={statusFilter || getDefaultStatusFilter(context)} onValueChange={setStatusFilter}>
                        <SelectTrigger id={id + '-status'} className="w-full lg:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{t('ordersDesign.' + status)}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}
            <div className="min-w-0 space-y-2">
                <Label htmlFor={id + '-sort'}>{t('ordersDesign.sort')}</Label>
                <Select value={sortOption} onValueChange={value => setSortOption(value as SortOption)}>
                    <SelectTrigger id={id + '-sort'} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{sortOptions.map(([value, key]) => <SelectItem key={value} value={value}>{t('ordersDesign.' + key)}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
    );
}
