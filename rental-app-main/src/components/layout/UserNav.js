import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCurrentUser } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { MoneyText } from "@/components/ui/money-text";
import { getBalanceColor } from "@/lib/balanceUtils";
export default function UserNav() {
    const { t } = useTranslation();
    const { data: user } = useCurrentUser();
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    if (!user)
        return null;
    const isAdmin = user.role === 'admin';
    const isManager = isAdmin || user.role === 'manager';
    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsOpen(false);
    };
    const handleNavigation = (path) => {
        navigate(path);
        setIsOpen(false);
    };
    const balanceColor = getBalanceColor(user.balance);
    return (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "relative h-10 w-fit px-3", children: [_jsx(Avatar, { className: "h-8 w-8", children: _jsx(AvatarFallback, { className: "bg-sky-100 text-sky-700 font-bold", children: user.full_name?.charAt(0).toUpperCase() }) }), _jsxs("div", { className: "ml-3 text-left hidden sm:block", children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: user.full_name }), _jsx("p", { className: `text-xs font-bold ${balanceColor}`, children: _jsx(MoneyText, { value: user.balance }) })] })] }) }), _jsxs(PopoverContent, { className: "w-56", align: "end", forceMount: true, children: [_jsx(Label, { className: "font-normal text-xs text-muted-foreground px-2", children: user.email }), _jsxs("div", { className: "grid gap-1 py-2", children: [_jsxs(Button, { variant: "ghost", className: "w-full justify-start", onClick: () => handleNavigation('/profile'), children: [_jsx(UserIcon, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.profile")] }), isManager && (_jsxs(Button, { variant: "ghost", className: "w-full justify-start", onClick: () => handleNavigation('/admin'), children: [_jsx(Shield, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.adminPanel")] }))] }), _jsx("div", { className: "border-t pt-2", children: _jsxs(Button, { variant: "ghost", className: "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50", onClick: handleLogout, children: [_jsx(LogOut, { className: "mr-2 h-4 w-4", "aria-hidden": "true" }), t("nav.logout")] }) })] })] }));
}
