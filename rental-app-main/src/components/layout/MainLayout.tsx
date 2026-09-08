import { Suspense } from "react";
import Header from "./Header";
import AnimatedOutlet from "@/components/shared/AnimatedOutlet";
import PageFallback from "@/components/shared/PageFallback";
import { useTranslation } from "react-i18next";

export default function MainLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        {t('shell.skipToContent')}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="min-w-0 scroll-mt-24 outline-none">
        {/*
          Suspense здесь: пока грузится lazy-чанк страницы, хедер остаётся,
          контент заменяется на скелетон PageFallback.
          AnimatedOutlet: короткий fade-переход между маршрутами
          (учитывает prefers-reduced-motion).
        */}
        <Suspense fallback={<PageFallback />}>
          <AnimatedOutlet />
        </Suspense>
      </main>
    </div>
  );
}
