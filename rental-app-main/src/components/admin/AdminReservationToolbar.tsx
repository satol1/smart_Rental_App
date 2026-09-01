// src/components/admin/AdminReservationToolbar.tsx

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { useAdminReservationSelectionStore } from '@/store/adminReservationSelectionStore';

interface Props {
    visibleReservationIds: number[];
    onBulkDelete: () => void;
    isDeleting: boolean;
}

export function AdminReservationToolbar({ visibleReservationIds, onBulkDelete, isDeleting }: Props) {
    const { selectedIds, setSelectedIds, clearSelection } = useAdminReservationSelectionStore();

    const isAllSelected = visibleReservationIds.length > 0 && selectedIds.length === visibleReservationIds.length;
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < visibleReservationIds.length;

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedIds(visibleReservationIds);
        } else {
            clearSelection();
        }
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-slate-50 border rounded-md mb-4 h-14">
            <div className="flex items-center gap-2">
                <Checkbox
                    id="select-all"
                    checked={isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)}
                    onCheckedChange={handleSelectAll}
                    aria-label="Выбрать все видимые резервы"
                />
                <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Выбрать все
                </label>
            </div>

            {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 animate-in fade-in-0 duration-300">
          <span className="text-sm text-slate-500">
            Выбрано: {selectedIds.length}
          </span>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={onBulkDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? 'Удаление...' : 'Удалить выбранное'}
                    </Button>
                </div>
            )}
        </div>
    );
}