// src/components/shared/ConflictIndicator.tsx

import { AlertTriangle } from "lucide-react";
import type { AvailabilityInfo } from "@/types/availability";
import { formatDateEuropean } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ConflictIndicatorProps {
  availability: AvailabilityInfo;
  showDetails?: boolean;
  variant?: 'inline' | 'block' | 'minimal';
  className?: string;
}

/**
 * Переиспользуемый компонент для отображения конфликтов доступности оборудования.
 * Показывает статус (в аренде/в резерве) и детали конфликта.
 */
export default function ConflictIndicator({
  availability,
  showDetails = true,
  variant = 'inline',
  className
}: ConflictIndicatorProps) {
  const hasConflict = availability.status !== 'available';
  
  if (!hasConflict) {
    return null;
  }

  const conflictColorClass = availability.status === 'rented' ? 'bg-danger-soft' : 'bg-warning-soft';
  const statusText = availability.status === 'rented' ? 'В аренде' : 'В резерве';
  
  // Форматируем диапазон дат конфликта
  const formatConflictDateRange = () => {
    if (!availability.start_date || !availability.end_date) return null;
    
    const startDate = formatDateEuropean(availability.start_date);
    const endDate = formatDateEuropean(availability.end_date);
    return `${statusText} с ${startDate} по ${endDate}`;
  };

  const conflictDateRange = formatConflictDateRange();

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <AlertTriangle className="h-3 w-3 text-destructive" />
        <span className="text-xs font-medium">{statusText}</span>
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <div className={cn("p-2 rounded-md transition-colors", conflictColorClass, className)}>
        {showDetails && conflictDateRange && (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-xs font-medium">{conflictDateRange}</span>
          </div>
        )}
      </div>
    );
  }

  // variant === 'inline' (по умолчанию)
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <AlertTriangle className="h-3 w-3 text-destructive" />
      <span className="text-xs font-medium">{statusText}</span>
      {showDetails && conflictDateRange && (
        <span className="text-xs text-destructive ml-1">
          ({conflictDateRange})
        </span>
      )}
    </div>
  );
}
