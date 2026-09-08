// src/app/App.tsx

import { lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import MainLayout from "@/components/layout/MainLayout";
import RequireAuth from "@/components/RequireAuth";
import CookieConsent from "@/components/shared/CookieConsent";
import { useThemeStore } from "@/store/themeStore";

// --- Публичные страницы (каждая — отдельный чанк) ---
const HomePage = lazy(() => import("@/pages/HomePage"));
const HowItWorksPage = lazy(() => import("@/pages/HowItWorksPage"));
const RulesPage = lazy(() => import("@/pages/RulesPage"));
const ReservePage = lazy(() => import("@/pages/ReservePage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const MyReservationsPage = lazy(() => import("@/pages/MyReservationsPage"));

// --- Страницы управления (не в admin/, но тяжёлые) ---
const UserManagementPage = lazy(() => import("@/pages/UserManagementPage"));
const EquipmentManagementPage = lazy(() => import("@/pages/EquipmentManagementPage"));
const AccessoryManagementPage = lazy(() => import("@/pages/AccessoryManagementPage"));

// --- Админ-страницы (делятся на чанки автоматически через React.lazy;
// manualChunks в vite.config.ts группирует ТОЛЬКО node_modules — см. hotfix 5.0.1) ---
const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const AllReservationsManagementPage = lazy(() => import("@/pages/admin/AllReservationsManagementPage"));
const RentalManagementPage = lazy(() => import("@/pages/admin/RentalManagementPage"));
const PromoCodeManagementPage = lazy(() => import("@/pages/admin/PromoCodeManagementPage"));
const HolidayManagementPage = lazy(() => import("@/pages/admin/HolidayManagementPage"));
const AssociationManagementPage = lazy(() => import("@/pages/admin/AssociationManagementPage"));
const PackManagementPage = lazy(() => import("@/pages/admin/PackManagementPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));

// --- Служебные ---
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const ForbiddenPage = lazy(() => import("@/pages/ForbiddenPage"));


/** Сброс прокрутки при смене маршрута: без этого с длинного каталога
 *  на «Мои заказы» попадаешь со старой позицией скролла. */
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [pathname]);

    return null;
}

function App() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

    return (
        <MotionConfig reducedMotion="user">
            {/*
              Suspense-граница находится в MainLayout вокруг AnimatedOutlet:
              пока грузится lazy-чанк страницы, хедер остаётся на месте,
              а контент заменяется на PageFallback.
            */}
            <ScrollToTop />
            <Routes>
                <Route element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="how-it-works" element={<HowItWorksPage />} />
                    <Route path="rules" element={<RulesPage />} />
                    <Route path="reserve/create" element={<ReservePage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="reservations/my" element={<RequireAuth><MyReservationsPage /></RequireAuth>} />
                    <Route path="admin" element={<RequireAuth role={["manager", "admin"]}><DashboardPage /></RequireAuth>} />
                    <Route path="admin/rentals" element={<RequireAuth role={["manager", "admin"]}><RentalManagementPage /></RequireAuth>} />
                    <Route path="admin/users" element={<RequireAuth role={["manager", "admin"]}><UserManagementPage /></RequireAuth>} />
                    <Route path="admin/equipment" element={<RequireAuth role={["manager", "admin"]}><EquipmentManagementPage /></RequireAuth>} />
                    <Route path="admin/accessories" element={<RequireAuth role={["manager", "admin"]}><AccessoryManagementPage /></RequireAuth>} />
                    <Route path="admin/reservations" element={<RequireAuth role={["manager", "admin"]}><AllReservationsManagementPage /></RequireAuth>} />
                    <Route path="admin/promocodes" element={<RequireAuth role={["manager", "admin"]}><PromoCodeManagementPage /></RequireAuth>} />
                    <Route path="admin/holidays" element={<RequireAuth role={["admin"]}><HolidayManagementPage /></RequireAuth>} />
                    <Route path="admin/associations" element={<RequireAuth role={["manager", "admin"]}><AssociationManagementPage /></RequireAuth>} />
                    <Route path="admin/packs" element={<RequireAuth role={["manager", "admin"]}><PackManagementPage /></RequireAuth>} />
                    <Route path="admin/settings" element={<RequireAuth role={["admin"]}><SettingsPage /></RequireAuth>} />

                    <Route path="forbidden" element={<ForbiddenPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
            <Toaster richColors position="top-right" theme={resolvedTheme} />
            <CookieConsent />
        </MotionConfig>
    );
}

export default App;
