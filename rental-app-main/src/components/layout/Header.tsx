// path: rental-app-main/src/components/layout/Header.tsx

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import BrandLogo from "@/components/shared/BrandLogo";
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
    if (!user) return null;

    // Получаем статус пользователя с маппингом старых статусов
    const userStatus = mapLegacyUserStatus(user.status);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <RoleBadge role={user.role} />
            </div>
            {userStatus && (
                <>
                    <div className="h-4 w-px bg-border" />
                    <StatusBadge status={userStatus} className="text-xs" />
                </>
            )}
        </div>
    );
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
    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (isHomePage) {
            // Если мы на главной странице, сбрасываем все состояния
            resetHomePage();
        } else {
            // Если мы на другой странице, переходим на главную
            navigate("/");
        }
    };

    return (
        <>
            <header className="bg-background/90 backdrop-blur-md border-b border-border/70 sticky top-0 z-50 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex-shrink-0">
                            <button 
                                onClick={handleLogoClick}
                                aria-label={isHomePage ? t("nav.resetFilters") : t("nav.goHome")}
                                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl p-1 transition-transform"
                            >
                                <BrandLogo size={42} showText={true} />
                            </button>
                        </div>

                        {/* Навигационные пункты для всех пользователей */}
                        <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {user && (
                                <>
                                    <UserStatus />
                                    <div className="h-5 w-px bg-border mx-2" />
                                </>
                            )}
                            <Link to="/how-it-works" className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-foreground hover:bg-accent/60 transition-all">
                                <HelpCircle className="w-4 h-4 text-primary/70" aria-hidden="true" /> {t("nav.howItWorks")}
                            </Link>
                            <Link to="/rules" className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-foreground hover:bg-accent/60 transition-all">
                                <AlertTriangle className="w-4 h-4 text-amber-500/80" aria-hidden="true" /> {t("nav.ourRules")}
                            </Link>
                            <button onClick={() => setContactOpen(true)} className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer">
                                <Send className="w-4 h-4 text-sky-500/80" aria-hidden="true" /> {t("nav.contact")}
                            </button>
                        </div>

                        {/* Мобильное меню: разделы были недостижимы на экранах < lg */}
                        <div className="lg:hidden flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                aria-expanded={isMobileMenuOpen}
                                aria-label={isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
                                className="h-10 w-10"
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                        </div>

                        <div className="flex items-center">
                            <nav className="flex items-center gap-2">
                                {/* Переключатель темы (Светлое/Тёмное/Системное) */}
                                <ThemeSwitcher />
                                {isLoading ? (
                                    <div className="h-10 w-48 bg-gray-200 rounded-md animate-pulse" />
                                ) : user ? (
                                    // Функционал для авторизованного пользователя сохранен полностью
                                    <>
                                        <Button
                                            variant="default"
                                            onClick={() => navigate("/reservations/my")}
                                            className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-lg shadow-sm"
                                        >
                                            <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
                                            {t("nav.myOrders")}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate("/calendar")}
                                            className="h-9 px-3.5 text-xs sm:text-sm font-medium rounded-lg bg-pastel-amber text-pastel-amber-fg border border-amber-200/50 hover:bg-amber-100/80 transition-colors"
                                        >
                                            <Calendar className="mr-1.5 h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                            {t("nav.calendar")}
                                        </Button>
                                        <div className="h-6 w-px bg-border mx-1" />
                                        <UserNav />
                                    </>
                                ) : (
                                    // Новый функционал для неавторизованного пользователя
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate("/calendar")}
                                            className="h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
                                            title={t("nav.calendar")}
                                        >
                                            <Calendar className="sm:mr-2 h-4 w-4" aria-hidden="true" />
                                            <span className="hidden sm:inline">{t("nav.calendar")}</span>
                                        </Button>
                                        <Button 
                                            onClick={() => setAuthDialogOpen(true)}
                                            className="h-9 px-3 sm:px-4 text-xs sm:text-sm"
                                        >
                                            <LogIn className="sm:mr-2 h-4 w-4" aria-hidden="true" />
                                            <span className="hidden sm:inline">{t("nav.loginRegister")}</span>
                                            <span className="sm:hidden">Войти</span>
                                        </Button>
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Разворачиваемая панель мобильного меню */}
                {isMobileMenuOpen && (
                    <nav className="lg:hidden border-t border-gray-200 bg-background px-4 py-3 text-sm" aria-label={t("nav.menu", "Меню")}>
                        {user && (
                            <div className="mb-3 pb-3 border-b border-gray-200">
                                <UserStatus />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <Link
                                to="/how-it-works"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-sky-700"
                            >
                                <HelpCircle className="w-4 h-4" aria-hidden="true" /> {t("nav.howItWorks")}
                            </Link>
                            <Link
                                to="/rules"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-sky-700"
                            >
                                <AlertTriangle className="w-4 h-4" aria-hidden="true" /> {t("nav.ourRules")}
                            </Link>
                            <button
                                onClick={() => { setMobileMenuOpen(false); setContactOpen(true); }}
                                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-gray-600 hover:bg-gray-100 hover:text-sky-700"
                            >
                                <Send className="w-4 h-4" aria-hidden="true" /> {t("nav.contact")}
                            </button>
                        </div>
                    </nav>
                )}
            </header>
            
            {/* Диалоги (контактный и авторизации) */}
            <ContactDialog open={isContactOpen} onOpenChange={setContactOpen} />
            <AuthDialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen} />
        </>
    );
}