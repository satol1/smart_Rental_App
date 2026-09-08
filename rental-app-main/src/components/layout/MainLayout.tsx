import { Suspense } from "react";
import Header from "./Header";
import AnimatedOutlet from "@/components/shared/AnimatedOutlet";
import PageFallback from "@/components/shared/PageFallback";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        {/*
          Suspense здесь: пока грузится lazy-чанк страницы, хедер остаётся,
          контент заменяется на скелетон PageFallback.
          AnimatedOutlet: fade + translateY(8px) переход между маршрутами
          (учитывает prefers-reduced-motion).
        */}
        <Suspense fallback={<PageFallback />}>
          <AnimatedOutlet />
        </Suspense>
      </main>
    </div>
  );
}
