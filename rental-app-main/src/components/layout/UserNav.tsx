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

    if (!user) return null;

    const isAdmin = user.role === 'admin';
    const isManager = isAdmin || user.role === 'manager';

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsOpen(false);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const balanceColor = getBalanceColor(user.balance);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-fit px-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-sky-100 text-sky-700 font-bold">
                            {user.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="ml-3 text-left hidden sm:block">
                        <p className="text-sm font-medium text-gray-800">{user.full_name}</p>
                        <p className={`text-xs font-bold ${balanceColor}`}><MoneyText value={user.balance} /></p>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end" forceMount>
                <Label className="font-normal text-xs text-muted-foreground px-2">
                    {user.email}
                </Label>
                <div className="grid gap-1 py-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation('/profile')}>
                        <UserIcon className="mr-2 h-4 w-4" aria-hidden="true" />{t("nav.profile")}
                    </Button>
                    {isManager && (
                         <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation('/admin')}>
                            <Shield className="mr-2 h-4 w-4" aria-hidden="true" />{t("nav.adminPanel")}
                        </Button>
                    )}
                </div>
                <div className="border-t pt-2">
                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />{t("nav.logout")}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}


