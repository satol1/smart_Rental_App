// src/components/ui/skeleton-list.tsx
// Переиспользуемые скелетоны для списков и таблиц.
// Работают в обеих темах (bg-muted / bg-card из CSS-токенов).

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface SkeletonCardProps {
  /** Компактная карточка (для плотных сеток) */
  compact?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Скелетон карточки каталога: превью, пара строк текста, «кнопка».
 * Похож по пропорциям на EquipmentCard/PackCard.
 */
export function SkeletonCard({ compact, className, ...rest }: SkeletonCardProps) {
  return (
    <div
      data-testid={rest["data-testid"] ?? "skeleton-card"}
      aria-hidden="true"
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden",
        compact ? "p-3 space-y-2" : "p-4 space-y-3",
        className,
      )}
    >
      <Skeleton className={cn("w-full rounded-md", compact ? "h-28" : "h-40")} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className={cn("rounded-md", compact ? "h-8 w-20" : "h-9 w-24")} />
      </div>
    </div>
  );
}

interface SkeletonListProps {
  /** Количество карточек-скелетонов */
  count?: number;
  compact?: boolean;
  /** Классы сетки; по умолчанию — адаптивная сетка каталога.
   * Чтобы получить одну колонку, передайте columns="single" — простой
   * className="grid-cols-1" не перекрывает sm:/lg:/xl:-варианты. */
  className?: string;
  /** Формат сетки: каталог (адаптивная) или single (одна колонка) */
  columns?: "catalog" | "single";
  /** Задать data-testid каждой карточке (для тестов) */
  testId?: string;
}

/**
 * Сетка скелетон-карточек для состояний загрузки списков.
 */
export function SkeletonList({
  count = 8,
  compact,
  className,
  columns = "catalog",
  testId,
}: SkeletonListProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === "single" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      data-testid="skeleton-list"
      role="status"
      aria-label={t('common.loading')}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} compact={compact} data-testid={testId} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  /** Количество строк-скелетонов */
  rows?: number;
  /** Количество колонок */
  columns?: number;
  className?: string;
}

/**
 * Скелетон таблицы: заголовочная строка + строки с шиммером.
 * Для админ-таблиц.
 */
export function SkeletonTable({ rows = 8, columns = 5, className }: SkeletonTableProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("w-full space-y-2", className)} data-testid="skeleton-table" role="status" aria-label={t('common.loading')} aria-busy="true">
      {/* Заголовок */}
      <div className="flex items-center gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {/* Строки */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-2.5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn("h-4 flex-1", colIndex === 0 && "max-w-[180px]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
