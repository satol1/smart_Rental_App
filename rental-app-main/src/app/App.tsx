// src/app/App.tsx

import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import RequireAuth from "@/components/RequireAuth";
import HomePage from "@/pages/HomePage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import RulesPage from "@/pages/RulesPage";
import ReservePage from "@/pages/ReservePage";
import ProfilePage from "@/pages/ProfilePage";
import MyReservationsPage from "@/pages/MyReservationsPage";
import CalendarPage from "@/pages/CalendarPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import UserManagementPage from "@/pages/UserManagementPage";
import EquipmentManagementPage from "@/pages/EquipmentManagementPage";
import AccessoryManagementPage from "@/pages/AccessoryManagementPage";
import AllReservationsManagementPage from "@/pages/admin/AllReservationsManagementPage";
import PromoCodeManagementPage from "@/pages/admin/PromoCodeManagementPage";
import HolidayManagementPage from "@/pages/admin/HolidayManagementPage";
import AssociationManagementPage from "@/pages/admin/AssociationManagementPage";
import RentalManagementPage from "@/pages/admin/RentalManagementPage";
import PackManagementPage from "@/pages/admin/PackManagementPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import CookieConsent from "@/components/shared/CookieConsent";
import NotFoundPage from "@/pages/NotFoundPage";
import ForbiddenPage from "@/pages/ForbiddenPage";


function App() {
    return (
        // +++ 2. ОБЕРНИТЕ ВСЕ В ФРАГМЕНТ И ДОБАВЬТЕ TOASTER +++
        <>
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
            <Toaster richColors position="top-right" />
            <CookieConsent />
        </>
    );
}

export default App;