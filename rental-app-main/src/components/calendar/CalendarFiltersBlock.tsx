// src/components/calendar/CalendarFiltersBlock.tsx
import CalendarDateInputRange from "@/components/calendar/CalendarDateInputRange";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";

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

export default function CalendarFiltersBlock({
                                                 availableTypes,
                                                 availableBrands,
                                                 typeFilter,
                                                 setTypeFilter,
                                                 brandFilter,
                                                 setBrandFilter,
                                                 searchText,
                                                 setSearchText,
                                                 onReset,
                                             }: Props) {

    return (
        <div className="flex flex-col gap-4 mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm print:hidden">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                <div className="flex flex-col gap-2">
                    <input
                        type="text"
                        placeholder="Поиск по названию..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="border px-3 py-1 rounded-md text-sm w-[250px]"
                    />
                    <CalendarDateInputRange />
                </div>
                <Button
                    variant="ghost"
                    onClick={onReset}
                    className="text-gray-600 hover:text-sky-700"
                >
                    <FilterX className="w-4 h-4 mr-1" />
                    Сбросить
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">Тип:</span>
                <Button
                    variant="filter"
                    data-state={typeFilter === null ? "on" : "off"}
                    onClick={() => setTypeFilter(null)}
                >
                    Все
                </Button>
                {availableTypes.map((type) => (
                    <Button
                        key={type}
                        variant="filter"
                        data-state={typeFilter === type ? "on" : "off"}
                        onClick={() => setTypeFilter(type)}
                    >
                        {type}
                    </Button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">Бренд:</span>
                <Button
                    variant="filter"
                    data-state={brandFilter === null ? "on" : "off"}
                    onClick={() => setBrandFilter(null)}
                >
                    Все
                </Button>
                {availableBrands.map((brand) => (
                    <Button
                        key={brand}
                        variant="filter"
                        data-state={brandFilter === brand ? "on" : "off"}
                        onClick={() => setBrandFilter(brand)}
                    >
                        {brand}
                    </Button>
                ))}
            </div>
        </div>
    );
}
