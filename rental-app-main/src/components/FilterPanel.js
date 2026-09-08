import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export default function FilterPanel({ availableTypes, availableBrands, availableAssociations, hasActiveFilters }) {
    const reset = useFilterStore(state => state.reset);
    return (_jsxs("div", { className: "bg-white border border-gray-200 shadow-sm rounded-lg p-4 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsx(SearchInput, {}), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AvailableCheckbox, {}), _jsx(GroupSimilarCheckbox, {}), _jsx(ViewModeToggle, {}), hasActiveFilters && (_jsxs(Button, { variant: "secondary", size: "sm", onClick: reset, className: "text-blue-700 bg-blue-50 hover:bg-blue-100", children: [_jsx(FilterX, { className: "w-4 h-4 mr-1.5" }), "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B"] }))] })] }), _jsx("div", { className: "flex flex-wrap gap-2 sm:gap-3", children: _jsx(TypeFilter, { availableTypes: availableTypes }) }), _jsx("div", { className: "flex flex-wrap gap-2 sm:gap-3", children: _jsx(AssociationFilter, { availableAssociations: availableAssociations }) }), _jsx("div", { className: "flex flex-wrap gap-2 sm:gap-3", children: _jsx(BrandFilter, { availableBrands: availableBrands }) })] }));
}
