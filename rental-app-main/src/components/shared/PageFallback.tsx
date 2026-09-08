// src/components/shared/PageFallback.tsx
// Скелетон страницы для React.lazy + Suspense.
// Лого-плейсхолдер + шиммер-блоки вместо пустого div.
// Работает в обеих темах (токены bg-muted / bg-card).

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PageFallbackProps {
  className?: string;
}

export default function PageFallback({ className }: PageFallbackProps) {
  return (
    <div
      data-testid="page-fallback"
      className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6",
        className,
      )}
      role="status"
      aria-label="Страница загружается"
    >
      {/* Шапка страницы: лого-плейсхолдер + заголовок */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
      </div>

      {/* Строка действий/фильтров */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md ml-auto" />
      </div>

      {/* Сетка контента */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border bg-card p-4 space-y-3 shadow-sm"
          >
            <Skeleton className="h-40 w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
