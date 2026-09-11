// src/components/admin/dashboard/ActivityFeedWidget.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, X, Play, CheckCircle, UserPlus, Package, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { ActivityFeedItem } from "@/hooks/admin/useDashboardData";

interface ActivityFeedWidgetProps {
    data: ActivityFeedItem[];
    isLoading: boolean;
}

export default function ActivityFeedWidget({ data, isLoading }: ActivityFeedWidgetProps) {
    const getActivityIcon = (type: ActivityFeedItem['type']) => {
        switch (type) {
            case 'reservation_created':
                return <Calendar className="w-4 h-4 text-primary" />;
            case 'reservation_cancelled':
                return <X className="w-4 h-4 text-destructive" />;
            case 'rental_started':
                return <Play className="w-4 h-4 text-success" />;
            case 'rental_completed':
                return <CheckCircle className="w-4 h-4 text-success" />;
            case 'user_registered':
                return <UserPlus className="w-4 h-4 text-muted-foreground" />;
            case 'equipment_added':
                return <Package className="w-4 h-4 text-warning" />;
            default:
                return <Activity className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getActivityColor = (type: ActivityFeedItem['type']) => {
        switch (type) {
            case 'reservation_created':
                return 'bg-info-soft border-primary/25';
            case 'reservation_cancelled':
                return 'bg-danger-soft border-destructive/25';
            case 'rental_started':
                return 'bg-success-soft border-success/25';
            case 'rental_completed':
                return 'bg-success-soft border-success/25';
            case 'user_registered':
                return 'bg-muted border-border';
            case 'equipment_added':
                return 'bg-warning-soft border-warning/30';
            default:
                return 'bg-muted border-border';
        }
    };

    const getActivityBadgeVariant = (type: ActivityFeedItem['type']) => {
        switch (type) {
            case 'reservation_created':
                return 'default' as const;
            case 'reservation_cancelled':
                return 'destructive' as const;
            case 'rental_started':
                return 'secondary' as const;
            case 'rental_completed':
                return 'secondary' as const;
            case 'user_registered':
                return 'outline' as const;
            case 'equipment_added':
                return 'outline' as const;
            default:
                return 'outline' as const;
        }
    };

    const getActivityTypeLabel = (type: ActivityFeedItem['type']) => {
        switch (type) {
            case 'reservation_created':
                return 'Резерв создан';
            case 'reservation_cancelled':
                return 'Резерв отменен';
            case 'rental_started':
                return 'Аренда начата';
            case 'rental_completed':
                return 'Аренда завершена';
            case 'user_registered':
                return 'Пользователь зарегистрирован';
            case 'equipment_added':
                return 'Оборудование добавлено';
            default:
                return 'Событие';
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Лента активности
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Лента активности
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {data.length > 0 ? (
                        data.map((activity) => (
                            <div 
                                key={activity.id}
                                className={`flex items-start gap-3 p-3 border rounded-lg ${getActivityColor(activity.type)}`}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground mb-1">
                                        {activity.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>
                                            {formatDistanceToNow(new Date(activity.timestamp), { 
                                                addSuffix: true, 
                                                locale: ru 
                                            })}
                                        </span>
                                        {activity.user_name && (
                                            <>
                                                <span>•</span>
                                                <span>{activity.user_name}</span>
                                            </>
                                        )}
                                        {activity.equipment_name && (
                                            <>
                                                <span>•</span>
                                                <span>{activity.equipment_name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <Badge 
                                        variant={getActivityBadgeVariant(activity.type)}
                                        className="text-xs"
                                    >
                                        {getActivityTypeLabel(activity.type)}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p>Нет активности</p>
                            <p className="text-xs">События появятся здесь по мере их возникновения</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
