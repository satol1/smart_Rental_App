import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [pathname]);
    return null;
}
function App() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
    return (_jsxs(MotionConfig, { reducedMotion: "user", children: [_jsx(ScrollToTop, {}), _jsx(Routes, { children: _jsxs(Route, { element: _jsx(MainLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(HomePage, {}) }), _jsx(Route, { path: "how-it-works", element: _jsx(HowItWorksPage, {}) }), _jsx(Route, { path: "rules", element: _jsx(RulesPage, {}) }), _jsx(Route, { path: "reserve/create", element: _jsx(ReservePage, {}) }), _jsx(Route, { path: "calendar", element: _jsx(CalendarPage, {}) }), _jsx(Route, { path: "profile", element: _jsx(RequireAuth, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "reservations/my", element: _jsx(RequireAuth, { children: _jsx(MyReservationsPage, {}) }) }), _jsx(Route, { path: "admin", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "admin/rentals", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(RentalManagementPage, {}) }) }), _jsx(Route, { path: "admin/users", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(UserManagementPage, {}) }) }), _jsx(Route, { path: "admin/equipment", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(EquipmentManagementPage, {}) }) }), _jsx(Route, { path: "admin/accessories", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(AccessoryManagementPage, {}) }) }), _jsx(Route, { path: "admin/reservations", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(AllReservationsManagementPage, {}) }) }), _jsx(Route, { path: "admin/promocodes", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(PromoCodeManagementPage, {}) }) }), _jsx(Route, { path: "admin/holidays", element: _jsx(RequireAuth, { role: ["admin"], children: _jsx(HolidayManagementPage, {}) }) }), _jsx(Route, { path: "admin/associations", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(AssociationManagementPage, {}) }) }), _jsx(Route, { path: "admin/packs", element: _jsx(RequireAuth, { role: ["manager", "admin"], children: _jsx(PackManagementPage, {}) }) }), _jsx(Route, { path: "admin/settings", element: _jsx(RequireAuth, { role: ["admin"], children: _jsx(SettingsPage, {}) }) }), _jsx(Route, { path: "forbidden", element: _jsx(ForbiddenPage, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }), _jsx(Toaster, { richColors: true, position: "top-right", theme: resolvedTheme }), _jsx(CookieConsent, {})] }));
}
export default App;
