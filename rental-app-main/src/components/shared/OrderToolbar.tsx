import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useOrderFilterStore, type SortOption, type OrderContext } from "@/store/orderFilterStore"
import { isHideCompletedFilterActive } from "@/lib/filterUtils"
import { useEffect } from "react"

interface OrderToolbarProps {
    context: OrderContext
    showHideCompletedCheckbox?: boolean
}

export default function OrderToolbar({ context, showHideCompletedCheckbox }: OrderToolbarProps) {
    const { searchQuery, statusFilter, sortOption, setSearchQuery, setStatusFilter, setSortOption, getDefaultStatusFilter } = useOrderFilterStore()
    
    // Инициализируем фильтр по умолчанию для админских контекстов
    useEffect(() => {
        const defaultFilter = getDefaultStatusFilter(context)
        // Устанавливаем фильтр по умолчанию только если текущий фильтр не установлен или равен "hide-completed"
        if (!statusFilter || statusFilter === "hide-completed") {
            setStatusFilter(defaultFilter)
        }
    }, [context, statusFilter, setStatusFilter, getDefaultStatusFilter])

    // Определяем placeholder для поиска в зависимости от контекста
    const getSearchPlaceholder = () => {
        switch (context) {
            case "user-reservations":
            case "user-rentals":
                return "Поиск по оборудованию..."
            case "admin-reservations":
            case "admin-rentals":
                return "Поиск по клиенту..."
            default:
                return "Поиск..."
        }
    }

    // Определяем опции статуса в зависимости от контекста
    const getStatusOptions = () => {
        switch (context) {
            case "user-reservations":
                return [
                    { value: "active", label: "Активные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ]
            case "user-rentals":
                return [
                    { value: "active", label: "Активные" },
                    { value: "overdue", label: "Просроченные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ]
            case "admin-reservations":
                return [
                    { value: "active", label: "Активные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ]
            case "admin-rentals":
                return [
                    { value: "active", label: "Активные" },
                    { value: "overdue", label: "Просроченные" },
                    { value: "completed", label: "Завершенные" },
                    { value: "all", label: "Все" }
                ]
            default:
                return []
        }
    }

    const statusOptions = getStatusOptions()

    // Централизованная логика для чекбокса "Скрыть завершенные"
    const isHideCompletedChecked = isHideCompletedFilterActive(statusFilter)
    const handleHideCompletedChange = (checked: boolean | 'indeterminate') => {
        // Если indeterminate, считаем как false
        if (checked === true) {
            // Скрываем завершенные - показываем только активные и просроченные
            setStatusFilter('hide-completed')
        } else {
            // Показываем все статусы включая завершенные
            setStatusFilter('all')
        }
    }

    return (
        <div className="mb-4 flex flex-wrap items-center gap-4">
            <Input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
            />
            
            {showHideCompletedCheckbox ? (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="hide-completed-orders"
                        checked={isHideCompletedChecked}
                        onCheckedChange={handleHideCompletedChange}
                    />
                    <Label htmlFor="hide-completed-orders">Скрыть завершенные</Label>
                </div>
            ) : (
                <Select value={statusFilter || getDefaultStatusFilter(context)} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="Фильтр по статусу" />
                    </SelectTrigger>
                    <SelectContent>
                        {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <Select value={sortOption} onValueChange={(val) => setSortOption(val as SortOption)}>
                <SelectTrigger className="w-52">
                    <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="id_desc">Номер ↓</SelectItem>
                    <SelectItem value="id_asc">Номер ↑</SelectItem>
                    <SelectItem value="start_desc">Начало ↓</SelectItem>
                    <SelectItem value="start_asc">Начало ↑</SelectItem>
                    <SelectItem value="end_desc">Окончание ↓</SelectItem>
                    <SelectItem value="end_asc">Окончание ↑</SelectItem>
                    <SelectItem value="count_desc">Позиций ↓</SelectItem>
                    <SelectItem value="count_asc">Позиций ↑</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
