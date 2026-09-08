import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { isHideCompletedFilterActive } from "@/lib/filterUtils";
import { useEffect } from "react";
export default function OrderToolbar({ context, showHideCompletedCheckbox }) {
    const { searchQuery, statusFilter, sortOption, setSearchQuery, setStatusFilter, setSortOption, getDefaultStatusFilter } = useOrderFilterStore();
    // Инициализируем фильтр по умолчанию для админских контекстов
    useEffect(() => {
        const defaultFilter = getDefaultStatusFilter(context);
        // Устанавливаем фильтр по умолчанию только если текущий фильтр не установлен или равен "hide-completed"
        if (!statusFilter || statusFilter === "hide-completed") {
            setStatusFilter(defaultFilter);
        }
    }, [context, statusFilter, setStatusFilter, getDefaultStatusFilter]);
    // Определяем placeholder для поиска в зависимости от контекста
    const getSearchPlaceholder = () => {
        switch (context) {
            case "user-reservations":
            case "user-rentals":
                return "Поиск по оборудованию...";
            case "admin-reservations":
            case "admin-rentals":
                return "Поиск по клиенту...";
            default:
                return "Поиск...";
        }
    };
    // Определяем опции статуса в зависимости от контекста
    const getStatusOptions = () => {
        switch (context) {
            case "user-reservations":
                return [
                    { value: "active", label: "Активные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ];
            case "user-rentals":
                return [
                    { value: "active", label: "Активные" },
                    { value: "overdue", label: "Просроченные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ];
            case "admin-reservations":
                return [
                    { value: "active", label: "Активные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ];
            case "admin-rentals":
                return [
                    { value: "active", label: "Активные" },
                    { value: "overdue", label: "Просроченные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ];
            default:
                return [];
        }
    };
    const statusOptions = getStatusOptions();
    // Централизованная логика для чекбокса "Скрыть завершенные"
    const isHideCompletedChecked = isHideCompletedFilterActive(statusFilter);
    const handleHideCompletedChange = (checked) => {
        // Если indeterminate, считаем как false
        if (checked === true) {
            // Скрываем завершенные - показываем только активные и просроченные
            setStatusFilter('hide-completed');
        }
        else {
            // Показываем все статусы включая завершенные
            setStatusFilter('all');
        }
    };
    return (_jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-4", children: [_jsx(Input, { type: "text", placeholder: getSearchPlaceholder(), value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "max-w-xs" }), showHideCompletedCheckbox ? (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: "hide-completed-orders", checked: isHideCompletedChecked, onCheckedChange: handleHideCompletedChange }), _jsx(Label, { htmlFor: "hide-completed-orders", children: "\u0421\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044B\u0435" })] })) : (_jsxs(Select, { value: statusFilter || getDefaultStatusFilter(context), onValueChange: setStatusFilter, children: [_jsx(SelectTrigger, { className: "w-52", children: _jsx(SelectValue, { placeholder: "\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0443" }) }), _jsx(SelectContent, { children: statusOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })), _jsxs(Select, { value: sortOption, onValueChange: (val) => setSortOption(val), children: [_jsx(SelectTrigger, { className: "w-52", children: _jsx(SelectValue, { placeholder: "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "id_desc", children: "\u041D\u043E\u043C\u0435\u0440 \u2193" }), _jsx(SelectItem, { value: "id_asc", children: "\u041D\u043E\u043C\u0435\u0440 \u2191" }), _jsx(SelectItem, { value: "start_desc", children: "\u041D\u0430\u0447\u0430\u043B\u043E \u2193" }), _jsx(SelectItem, { value: "start_asc", children: "\u041D\u0430\u0447\u0430\u043B\u043E \u2191" }), _jsx(SelectItem, { value: "end_desc", children: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u2193" }), _jsx(SelectItem, { value: "end_asc", children: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u2191" }), _jsx(SelectItem, { value: "count_desc", children: "\u041F\u043E\u0437\u0438\u0446\u0438\u0439 \u2193" }), _jsx(SelectItem, { value: "count_asc", children: "\u041F\u043E\u0437\u0438\u0446\u0438\u0439 \u2191" })] })] })] }));
}
