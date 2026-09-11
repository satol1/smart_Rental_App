// src/components/admin/dashboard/KpiCardsWidget.tsx
import { formatMoney } from "@/lib/money";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Users, 
    Truck, 
    Package, 
    ClipboardList,
    DollarSign,
    TrendingUp,
    BarChart3,
    Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KpiData } from "@/hooks/admin/useDashboardData";

interface KpiCardsWidgetProps {
    data: KpiData;
    isLoading: boolean;
}

interface KpiCardProps {
    title: string;
    icon: React.ReactNode;
    stats: Array<{ 
        value: number; 
        label: string; 
        color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
        size?: 'sm' | 'md' | 'lg';
        format?: 'number' | 'currency' | 'percentage' | 'days';
    }>;
    navigateTo: string;
    variant?: 'default' | 'highlight' | 'accent';
}

// Функции для форматирования значений
const formatValue = (value: number, format?: string) => {
    switch (format) {
        case 'currency':
            return formatMoney(value);
        case 'percentage':
            return `${value.toFixed(1)}%`;
        case 'days':
            return `${value.toFixed(1)} дн.`;
        default:
            return value.toLocaleString();
    }
};

// Функции для получения цветовых классов
const getColorClasses = (color?: string) => {
    switch (color) {
        case 'primary':
            return 'text-primary';
        case 'success':
            return 'text-success';
        case 'warning':
            return 'text-warning';
        case 'danger':
            return 'text-destructive';
        case 'info':
            return 'text-primary';
        case 'muted':
            return 'text-muted-foreground';
        default:
            return 'text-foreground';
    }
};

const getSizeClasses = (size?: string) => {
    switch (size) {
        case 'sm':
            return 'text-sm';
        case 'lg':
            return 'text-xl';
        default:
            return 'text-lg';
    }
};

const getVariantClasses = (variant?: string) => {
    switch (variant) {
        case 'highlight':
            return 'bg-gradient-to-br from-info-soft/60 to-accent/60 border-primary/25 hover:border-primary/40';
        case 'accent':
            return 'bg-gradient-to-br from-success-soft/70 to-success-soft/40 border-success/25 hover:border-success/40';
        default:
            return 'border-border hover:border-foreground/25';
    }
};

// Компонент отдельной KPI карточки с навигацией
const KpiCard = ({ title, icon, stats, navigateTo, variant = 'default' }: KpiCardProps) => {
    const navigate = useNavigate();
    
    return (
        <Card 
            onClick={() => navigate(navigateTo)} 
            className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${getVariantClasses(variant)}`}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
                <div className="p-1.5 rounded-lg bg-card/50">
                    {icon}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex justify-between items-baseline gap-2">
                    {stats.map((stat, index) => (
                        <div key={index} className="flex items-center">
                            <div className="text-center flex-1">
                                <div className={`${getSizeClasses(stat.size)} font-bold ${getColorClasses(stat.color)}`}>
                                    {formatValue(stat.value, stat.format)}
                                </div>
                                <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
                            </div>
                            {index < stats.length - 1 && (
                                <div className="w-px h-8 bg-border mx-2"></div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default function KpiCardsWidget({ data, isLoading }: KpiCardsWidgetProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="bg-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-6 rounded-lg" />
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex justify-between items-baseline gap-2">
                                <div className="flex items-center">
                                    <div className="text-center flex-1">
                                        <Skeleton className="h-6 w-12 mb-1" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <div className="w-px h-8 bg-border mx-2"></div>
                                </div>
                                <div className="flex items-center">
                                    <div className="text-center flex-1">
                                        <Skeleton className="h-5 w-10 mb-1" />
                                        <Skeleton className="h-3 w-14" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Блок Пользователи */}
            <KpiCard
                title="Пользователи"
                navigateTo="/admin/users"
                variant="highlight"
                icon={<Users className="h-5 w-5 text-primary" />}
                stats={[
                    { 
                        value: data.total_users, 
                        label: 'Всего пользователей', 
                        color: 'primary',
                        size: 'lg'
                    },
                    { 
                        value: data.active_users, 
                        label: 'Активных', 
                        color: 'success',
                        size: 'md'
                    }
                ]}
            />

            {/* Блок Аренды */}
            <KpiCard
                title="Аренды"
                navigateTo="/admin/rentals"
                variant="accent"
                icon={<Truck className="h-5 w-5 text-success" />}
                stats={[
                    { 
                        value: data.total_rentals, 
                        label: 'Всего аренд', 
                        color: 'primary',
                        size: 'lg'
                    },
                    { 
                        value: data.active_rentals, 
                        label: 'Активных', 
                        color: 'success',
                        size: 'md'
                    },
                    { 
                        value: data.overdue_rentals, 
                        label: 'Просрочено', 
                        color: 'danger',
                        size: 'md'
                    }
                ]}
            />

            {/* Блок Резервы */}
            <KpiCard
                title="Резервы"
                navigateTo="/admin/reservations"
                icon={<ClipboardList className="h-5 w-5 text-muted-foreground" />}
                stats={[
                    { 
                        value: data.total_reservations, 
                        label: 'Всего резервов', 
                        color: 'primary',
                        size: 'lg'
                    },
                    { 
                        value: data.active_reservations, 
                        label: 'Активных', 
                        color: 'info',
                        size: 'md'
                    }
                ]}
            />

            {/* Блок Оборудование */}
            <KpiCard
                title="Оборудование"
                navigateTo="/admin/equipment"
                icon={<Package className="h-5 w-5 text-warning" />}
                stats={[
                    { 
                        value: data.total_equipment, 
                        label: 'Единиц оборудования', 
                        color: 'primary',
                        size: 'lg'
                    },
                    { 
                        value: data.total_accessories, 
                        label: 'Аксессуаров', 
                        color: 'warning',
                        size: 'md'
                    },
                    { 
                        value: data.total_associations, 
                        label: 'Ассоциаций', 
                        color: 'muted',
                        size: 'sm'
                    }
                ]}
            />

            {/* Блок Выручка сегодня */}
            <KpiCard
                title="Выручка сегодня"
                navigateTo="/admin/rentals"
                variant="highlight"
                icon={<DollarSign className="h-5 w-5 text-success" />}
                stats={[
                    { 
                        value: data.revenue_today, 
                        label: 'За сегодня', 
                        color: 'success',
                        size: 'lg',
                        format: 'currency'
                    }
                ]}
            />

            {/* Блок Выручка за месяц */}
            <KpiCard
                title="Выручка за месяц"
                navigateTo="/admin/rentals"
                variant="accent"
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                stats={[
                    { 
                        value: data.revenue_this_month, 
                        label: 'За текущий месяц', 
                        color: 'success',
                        size: 'lg',
                        format: 'currency'
                    }
                ]}
            />

            {/* Блок Загруженность */}
            <KpiCard
                title="Загруженность"
                navigateTo="/admin/equipment"
                icon={<BarChart3 className="h-5 w-5 text-primary" />}
                stats={[
                    { 
                        value: data.occupancy_rate, 
                        label: 'Средняя загруженность', 
                        color: data.occupancy_rate > 70 ? 'success' : data.occupancy_rate > 40 ? 'warning' : 'danger',
                        size: 'lg',
                        format: 'percentage'
                    }
                ]}
            />

            {/* Блок Средняя длительность */}
            <KpiCard
                title="Средняя длительность"
                navigateTo="/admin/rentals"
                icon={<Clock className="h-5 w-5 text-primary" />}
                stats={[
                    { 
                        value: data.avg_rental_duration, 
                        label: 'Аренды в днях', 
                        color: 'info',
                        size: 'lg',
                        format: 'days'
                    }
                ]}
            />
        </div>
    );
}
