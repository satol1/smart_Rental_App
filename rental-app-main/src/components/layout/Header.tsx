// path: rental-app-main/src/components/layout/Header.tsx

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useCurrentUser } from "@/hooks/useProfile";
import { useHomePageReset } from "@/hooks/useHomePageReset";
import UserNav from "./UserNav";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Shield, Calendar, FileText, HelpCircle, AlertTriangle, Send, LogIn } from "lucide-react";
import { ContactDialog } from "@/components/shared/ContactDialog";
import AuthDialog from "@/components/shared/AuthDialog"; // Импортируем новый диалог
import { USER_STATUS, USER_STATUS_BADGE_VARIANTS, USER_STATUS_COLORS, mapLegacyUserStatus, type UserStatus } from "@/constants/userStatusConstants";

const UserStatus = () => {
    const { data: user } = useCurrentUser();
    if (!user) return null;

    const isAdmin = user.role === "admin";
    const isManager = isAdmin || user.role === "manager";
    const roleLabel = isAdmin ? "Админ" : isManager ? "Менеджер" : "Пользователь";
    const roleColor = isAdmin ? "text-red-600" : isManager ? "text-blue-600" : "text-gray-600";

    // Получаем статус пользователя с маппингом старых статусов
    const userStatus = mapLegacyUserStatus(user.status);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
                <Shield className={`w-3.5 h-3.5 ${roleColor}`} />
                <span className={roleColor}>{roleLabel}</span>
            </div>
            {userStatus && (
                <>
                    <div className="h-4 w-px bg-gray-200" />
                    <Badge 
                        variant={USER_STATUS_BADGE_VARIANTS[userStatus] || "secondary"}
                        className={`text-xs ${USER_STATUS_COLORS[userStatus] || ""}`}
                    >
                        {userStatus}
                    </Badge>
                </>
            )}
        </div>
    );
};

export default function Header() {
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const { resetHomePage } = useHomePageReset();
    const [isContactOpen, setContactOpen] = useState(false);
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false); // Состояние для диалога входа

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
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex-shrink-0">
                            <button 
                                onClick={handleLogoClick}
                                aria-label={isHomePage ? "Сбросить фильтры" : "На главную"}
                                className="transition-transform hover:scale-105 active:scale-95 focus:outline-none rounded-md"
                            >
                                <img
                                    src={logo}
                                    alt="Логотип PhotoRental"
                                    className="h-16 w-auto"
                                />
                            </button>
                        </div>

                        {/* Навигационные пункты для всех пользователей */}
                        <div className="hidden lg:flex items-center gap-6 text-sm">
                            {user && (
                                <>
                                    <UserStatus />
                                    <div className="h-6 w-px bg-gray-200" />
                                </>
                            )}
                            <Link to="/how-it-works" className="flex items-center gap-1.5 text-gray-600 hover:text-sky-700">
                                <HelpCircle className="w-4 h-4" /> Как это работает
                            </Link>
                            <Link to="/rules" className="flex items-center gap-1.5 text-gray-600 hover:text-sky-700">
                                <AlertTriangle className="w-4 h-4" /> Наши правила
                            </Link>
                            <button onClick={() => setContactOpen(true)} className="flex items-center gap-1.5 text-gray-600 hover:text-sky-700">
                                <Send className="w-4 h-4" /> Связаться
                            </button>
                        </div>

                        <div className="flex items-center">
                            <nav className="flex items-center gap-2">
                                {isLoading ? (
                                    <div className="h-10 w-48 bg-gray-200 rounded-md animate-pulse" />
                                ) : user ? (
                                    // Функционал для авторизованного пользователя сохранен полностью
                                    <>
                                        <Button
                                            variant="default"
                                            onClick={() => navigate("/reservations/my")}
                                            className="h-10 px-4 text-sm bg-black hover:bg-gray-800 text-white"
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            Мои заказы
                                        </Button>
                                        <Button
                                            onClick={() => navigate("/calendar")}
                                            className="h-10 px-4 text-sm bg-amber-500 hover:bg-amber-600 text-white"
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Календарь
                                        </Button>
                                        <div className="h-8 w-px bg-gray-200 mx-2" />
                                        <UserNav />
                                    </>
                                ) : (
                                    // Новый функционал для неавторизованного пользователя
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate("/calendar")}
                                            className="h-10 px-4 text-sm"
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Календарь
                                        </Button>
                                        <Button 
                                            onClick={() => setAuthDialogOpen(true)}
                                            className="h-10 px-4 text-sm"
                                        >
                                            <LogIn className="mr-2 h-4 w-4" />
                                            Войти / Регистрация
                                        </Button>
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>
            </header>
            
            {/* Диалоги (контактный и авторизации) */}
            <ContactDialog open={isContactOpen} onOpenChange={setContactOpen} />
            <AuthDialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen} />
        </>
    );
}