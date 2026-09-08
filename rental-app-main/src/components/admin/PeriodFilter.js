import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Компонент фильтра по временным периодам
 */
import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { PeriodService } from "@/core/services/PeriodService";
export function PeriodFilter({ className }) {
    const { periodType, periodOffset, setPeriodType, setPeriodOffset } = useOrderFilterStore();
    const periodOptions = useMemo(() => PeriodService.getPeriodOptions(), []);
    const navigation = useMemo(() => PeriodService.getPeriodNavigation(periodType, periodOffset), [periodType, periodOffset]);
    const handlePeriodTypeChange = useCallback((value) => {
        if (value === "all") {
            setPeriodType(null);
            setPeriodOffset(0);
        }
        else {
            setPeriodType(value);
            setPeriodOffset(0); // Сбрасываем смещение при смене типа периода
        }
    }, [setPeriodType, setPeriodOffset]);
    const handlePreviousPeriod = useCallback(() => {
        if (periodType) {
            setPeriodOffset(periodOffset - 1);
        }
    }, [periodType, periodOffset, setPeriodOffset]);
    const handleNextPeriod = useCallback(() => {
        if (periodType) {
            setPeriodOffset(periodOffset + 1);
        }
    }, [periodType, periodOffset, setPeriodOffset]);
    const handleCurrentPeriod = useCallback(() => {
        if (periodType) {
            setPeriodOffset(0);
        }
    }, [periodType, setPeriodOffset]);
    return (_jsxs("div", { className: `flex items-center gap-2 ${className || ""}`, children: [_jsx(Calendar, { className: "h-4 w-4 text-muted-foreground" }), _jsxs(Select, { value: periodType || "all", onValueChange: handlePeriodTypeChange, children: [_jsx(SelectTrigger, { className: "w-[140px]", children: _jsx(SelectValue, { placeholder: "\u041F\u0435\u0440\u0438\u043E\u0434" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "\u0412\u0441\u0435 \u043F\u0435\u0440\u0438\u043E\u0434\u044B" }), periodOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value)))] })] }), periodType && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: handlePreviousPeriod, className: "h-8 w-8 p-0", title: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCurrentPeriod, className: "h-8 px-3 text-sm font-medium", title: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", children: navigation.currentLabel }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleNextPeriod, className: "h-8 w-8 p-0", title: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] }))] }));
}
/**
 * Компактная версия фильтра для использования в ограниченном пространстве
 */
export function PeriodFilterCompact({ className }) {
    const { periodType, periodOffset, setPeriodType, setPeriodOffset } = useOrderFilterStore();
    const periodOptions = useMemo(() => PeriodService.getPeriodOptions(), []);
    const handlePeriodTypeChange = useCallback((value) => {
        if (value === "all") {
            setPeriodType(null);
            setPeriodOffset(0);
        }
        else {
            setPeriodType(value);
            setPeriodOffset(0);
        }
    }, [setPeriodType, setPeriodOffset]);
    const handlePreviousPeriod = useCallback(() => {
        if (periodType) {
            setPeriodOffset(periodOffset - 1);
        }
    }, [periodType, periodOffset, setPeriodOffset]);
    const handleNextPeriod = useCallback(() => {
        if (periodType) {
            setPeriodOffset(periodOffset + 1);
        }
    }, [periodType, periodOffset, setPeriodOffset]);
    return (_jsxs("div", { className: `flex items-center gap-1 ${className || ""}`, children: [_jsxs(Select, { value: periodType || "all", onValueChange: handlePeriodTypeChange, children: [_jsx(SelectTrigger, { className: "w-[100px] h-8", children: _jsx(SelectValue, { placeholder: "\u041F\u0435\u0440\u0438\u043E\u0434" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "\u0412\u0441\u0435" }), periodOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value)))] })] }), periodType && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", onClick: handlePreviousPeriod, className: "h-8 w-6 p-0", title: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", children: _jsx(ChevronLeft, { className: "h-3 w-3" }) }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleNextPeriod, className: "h-8 w-6 p-0", title: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", children: _jsx(ChevronRight, { className: "h-3 w-3" }) })] }))] }));
}
