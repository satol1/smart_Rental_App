// src/components/admin/AllRentalsList.tsx

// +++ ДОБАВЬТЕ ИМПОРТ AdminRentalOut +++
import type { AdminRentalOut } from "@/types/rental";
import { ClipboardX } from "lucide-react";
import AdminRentalCard from "./AdminRentalCard";

// +++ ИЗМЕНИТЕ ИНТЕРФЕЙС Props +++
interface Props {
    rentals: AdminRentalOut[];
    onReturn: (rental: AdminRentalOut) => void;
    highlightId?: number | null;
    elementRef?: React.RefObject<HTMLDivElement>;
    getHighlightClasses?: (id: number) => string;
}

export default function AllRentalsList({ rentals, onReturn, highlightId, elementRef, getHighlightClasses }: Props) {
    if (!rentals || rentals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 space-y-4 bg-muted/50 rounded-lg border-2 border-dashed">
                <ClipboardX className="w-16 h-16 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-foreground">Аренды не найдены</h3>
                <p className="text-sm text-muted-foreground">Попробуйте изменить фильтры или поисковый запрос.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* +++ ПЕРЕДАЙТЕ ПРОПС onReturn В КАРТОЧКУ +++ */}
            {rentals.map((rental) => (
                <AdminRentalCard 
                    key={rental.id} 
                    rental={rental} 
                    onReturn={onReturn} 
                    highlightId={highlightId ?? undefined}
                    elementRef={highlightId === rental.id ? elementRef : undefined}
                    getHighlightClasses={getHighlightClasses}
                />
            ))}
        </div>
    );
}