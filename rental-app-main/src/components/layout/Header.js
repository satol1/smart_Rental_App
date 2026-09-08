import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/layout/Header.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.webp";
import { useCurrentUser } from "@/hooks/useProfile";
import { useHomePageReset } from "@/hooks/useHomePageReset";
import UserNav from "./UserNav";
import ThemeSwitcher from "./ThemeSwitcher";
import { Button } from "../ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Shield, Calendar, FileText, HelpCircle, AlertTriangle, Send, LogIn, Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContactDialog } from "@/components/shared/ContactDialog";
import AuthDialog from "@/components/shared/AuthDialog"; // Импортируем новый диалог
import { mapLegacyUserStatus } from "@/constants/userStatusConstants";
const UserStatus = () => {
    const { data: user } = useCurrentUser();
    if (!user)
        return null;
    // Получаем статус пользователя с маппингом старых статусов
    const userStatus = mapLegacyUserStatus(user.status);
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-xs font-medium", children: [_jsx(Shield, { className: "w-3.5 h-3.5 text-muted-foreground", "aria-hidden": "true" }), _jsx(RoleBadge, { role: user.role })] }), userStatus && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-4 w-px bg-gray-200" }), _jsx(StatusBadge, { status: userStatus, className: "text-xs" })] }))] }));
};
export default function Header() {
    const { t } = useTranslation();
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const { resetHomePage } = useHomePageReset();
    const [isContactOpen, setContactOpen] = useState(false);
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false); // Состояние для диалога входа
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); // Мобильное меню (lg и ниже)
    // Проверяем, находимся ли мы на главной странице
    const isHomePage = location.pathname === "/";
    // Обработчик клика по логотипу
    const handleLogoClick = (e) => {
        e.preventDefault();
        if (isHomePage) {
            // Если мы на главной странице, сбрасываем все состояния
            resetHomePage();
        }
        else {
            // Если мы на другой странице, переходим на главную
            navigate("/");
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm sticky top-0 z-50", children: [_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "flex items-center justify-between h-20", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("button", { onClick: handleLogoClick, "aria-label": isHomePage ? t("nav.resetFilters") : t("nav.goHome"), className: "transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md", children: _jsx("img", { src: logo, alt: t("nav.logoAlt"), className: "h-16 w-auto" }) }) }), _jsxs("div", { className: "hidden lg:flex items-center gap-6 text-sm", children: [user && (_jsxs(_Fragment, { children: [_jsx(UserStatus, {}), _jsx("div", { className: "h-6 w-px bg-gray-200" })] })), _jsxs(Link, { to: "/how-it-works", className: "flex items-center gap-1.5 text-gray-600 hover:text-sky-700", children: [_jsx(HelpCircle, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.howItWorks")] }), _jsxs(Link, { to: "/rules", className: "flex items-center gap-1.5 text-gray-600 hover:text-sky-700", children: [_jsx(AlertTriangle, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.ourRules")] }), _jsxs("button", { onClick: () => setContactOpen(true), className: "flex items-center gap-1.5 text-gray-600 hover:text-sky-700", children: [_jsx(Send, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.contact")] })] }), _jsx("div", { className: "lg:hidden flex items-center", children: _jsx(Button, { variant: "ghost", size: "icon", onClick: () => setMobileMenuOpen(prev => !prev), "aria-expanded": isMobileMenuOpen, "aria-label": isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu"), className: "h-10 w-10", children: isMobileMenuOpen ? _jsx(X, { className: "h-5 w-5" }) : _jsx(Menu, { className: "h-5 w-5" }) }) }), _jsx("div", { className: "flex items-center", children: _jsxs("nav", { className: "flex items-center gap-2", children: [_jsx(ThemeSwitcher, {}), isLoading ? (_jsx("div", { className: "h-10 w-48 bg-gray-200 rounded-md animate-pulse" })) : user ? (
                                            // Функционал для авторизованного пользователя сохранен полностью
                                            _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "default", onClick: () => navigate("/reservations/my"), className: "h-10 px-4 text-sm bg-black hover:bg-gray-800 text-white", children: [_jsx(FileText, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.myOrders")] }), _jsxs(Button, { onClick: () => navigate("/calendar"), className: "h-10 px-4 text-sm bg-amber-500 hover:bg-amber-600 text-white", children: [_jsx(Calendar, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.calendar")] }), _jsx("div", { className: "h-8 w-px bg-gray-200 mx-2" }), _jsx(UserNav, {})] })) : (
                                            // Новый функционал для неавторизованного пользователя
                                            _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "outline", onClick: () => navigate("/calendar"), className: "h-10 px-4 text-sm", children: [_jsx(Calendar, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.calendar")] }), _jsxs(Button, { onClick: () => setAuthDialogOpen(true), className: "h-10 px-4 text-sm", children: [_jsx(LogIn, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.loginRegister")] })] }))] }) })] }) }), isMobileMenuOpen && (_jsxs("nav", { className: "lg:hidden border-t border-gray-200 bg-background px-4 py-3 text-sm", "aria-label": t("nav.menu", "Меню"), children: [user && (_jsx("div", { className: "mb-3 pb-3 border-b border-gray-200", children: _jsx(UserStatus, {}) })), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs(Link, { to: "/how-it-works", onClick: () => setMobileMenuOpen(false), className: "flex items-center gap-2 rounded-md px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-sky-700", children: [_jsx(HelpCircle, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.howItWorks")] }), _jsxs(Link, { to: "/rules", onClick: () => setMobileMenuOpen(false), className: "flex items-center gap-2 rounded-md px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-sky-700", children: [_jsx(AlertTriangle, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.ourRules")] }), _jsxs("button", { onClick: () => { setMobileMenuOpen(false); setContactOpen(true); }, className: "flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-gray-600 hover:bg-gray-100 hover:text-sky-700", children: [_jsx(Send, { className: "w-4 h-4", "aria-hidden": "true" }), " ", t("nav.contact")] })] })] }))] }), _jsx(ContactDialog, { open: isContactOpen, onOpenChange: setContactOpen }), _jsx(AuthDialog, { open: isAuthDialogOpen, onOpenChange: setAuthDialogOpen })] }));
}
