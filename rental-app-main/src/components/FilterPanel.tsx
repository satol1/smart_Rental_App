// src/components/FilterPanel.tsx

import SearchInput from "@/components/SearchInput";
import AvailableCheckbox from "@/components/AvailableCheckbox";
import GroupSimilarCheckbox from "@/components/GroupSimilarCheckbox";
import TypeFilter from "@/components/TypeFilter";
import BrandFilter from "@/components/BrandFilter";
import AssociationFilter from "@/components/AssociationFilter";
import ViewModeToggle from "@/components/ViewModeToggle";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";
import { FilterX } from "lucide-react";
import type { Equipment } from "@/types/equipment";
import type { Association } from "@/types/association";

interface FilterPanelProps {
    availableTypes: string[];
    availableBrands: Array<{id: number, name: string}>;
    availableAssociations: Association[];
    hasActiveFilters: boolean;
}

export default function FilterPanel({ 
    availableTypes, 
    availableBrands,
    availableAssociations, 
    hasActiveFilters 
}: FilterPanelProps) {
    const reset = useFilterStore(state => state.reset);

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <SearchInput />
                <div className="flex items-center gap-2">
                    <AvailableCheckbox />
                    <GroupSimilarCheckbox />
                    <ViewModeToggle />
                    {hasActiveFilters && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={reset}
                            className="text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                            <FilterX className="w-4 h-4 mr-1.5" />
                            Сбросить фильтры
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
                <TypeFilter availableTypes={availableTypes} />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
                <AssociationFilter availableAssociations={availableAssociations} />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
                <BrandFilter availableBrands={availableBrands} />
            </div>
        </div>
    );
}