// src/app/App.tsx

import { lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import MainLayout from "@/components/layout/MainLayout";
import AdminLayout from "@/components/admin/AdminLayout";
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

// --- Юридические страницы (152-ФЗ, 38-ФЗ) ---
const PrivacyPolicyPage = lazy(() => import("@/pages/legal/PrivacyPolicyPage"));
const ConsentPage = lazy(() => import("@/pages/legal/ConsentPage"));
const TermsOfServicePage = lazy(() => import("@/pages/legal/TermsOfServicePage"));
const CookiePolicyPage = lazy(() => import("@/pages/legal/CookiePolicyPage"));
const MarketingConsentPage = lazy(() => import("@/pages/legal/MarketingConsentPage"));

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

                    {/* Юридические страницы (152-ФЗ, 38-ФЗ) */}
                    <Route path="privacy" element={<PrivacyPolicyPage />} />
                    <Route path="privacy-policy" element={<Navigate to="/privacy" replace />} />
                    <Route path="consent" element={<ConsentPage />} />
                    <Route path="personal-data-consent" element={<Navigate to="/consent" replace />} />
                    <Route path="terms" element={<TermsOfServicePage />} />
                    <Route path="terms-of-service" element={<Navigate to="/terms" replace />} />
                    <Route path="cookies" element={<CookiePolicyPage />} />
                    <Route path="cookie-policy" element={<Navigate to="/cookies" replace />} />
                    <Route path="marketing-consent" element={<MarketingConsentPage />} />

                    <Route path="reserve/create" element={<ReservePage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="reservations/my" element={<RequireAuth><MyReservationsPage /></RequireAuth>} />

                    {/* Админ-раздел: общий каркас (AdminNavigation + Suspense) —
                        навигация не размонтируется при смене раздела */}
                    <Route
                        path="/admin"
                        element={
                            <RequireAuth role={["manager", "admin"]}>
                                <AdminLayout />
                            </RequireAuth>
                        }
                    >
                        <Route index element={<DashboardPage />} />
                        <Route path="rentals" element={<RentalManagementPage />} />
                        <Route path="users" element={<UserManagementPage />} />
                        <Route path="equipment" element={<EquipmentManagementPage />} />
                        <Route path="accessories" element={<AccessoryManagementPage />} />
                        <Route path="reservations" element={<AllReservationsManagementPage />} />
                        <Route path="promocodes" element={<PromoCodeManagementPage />} />
                        <Route path="holidays" element={<RequireAuth role={["admin"]}><HolidayManagementPage /></RequireAuth>} />
                        <Route path="associations" element={<AssociationManagementPage />} />
                        <Route path="packs" element={<PackManagementPage />} />
                        <Route path="settings" element={<RequireAuth role={["admin"]}><SettingsPage /></RequireAuth>} />
                    </Route>

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
