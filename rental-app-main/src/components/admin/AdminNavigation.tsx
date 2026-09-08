import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { Users, Package, LayoutDashboard, ArrowUpRight, Paperclip, ClipboardList, TicketPercent, CalendarDays, Tags, Truck, PackagePlus, Settings } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useProfile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
    { path: '/admin', key: 'overview', icon: LayoutDashboard, adminOnly: false },
    { path: '/admin/reservations', key: 'reservations', icon: ClipboardList, adminOnly: false },
    { path: '/admin/rentals', key: 'rentals', icon: Truck, adminOnly: false },
    { path: '/admin/users', key: 'users', icon: Users, adminOnly: false },
    { path: '/admin/equipment', key: 'equipmentAdmin', icon: Package, adminOnly: false },
    { path: '/admin/accessories', key: 'accessoriesAdmin', icon: Paperclip, adminOnly: false },
    { path: '/admin/associations', key: 'associations', icon: Tags, adminOnly: false },
    { path: '/admin/packs', key: 'packs', icon: PackagePlus, adminOnly: false },
    { path: '/admin/promocodes', key: 'discounts', icon: TicketPercent, adminOnly: false },
    { path: '/admin/holidays', key: 'holidays', icon: CalendarDays, adminOnly: true },
    { path: '/admin/settings', key: 'settings', icon: Settings, adminOnly: true },
];

export default function AdminNavigation() {
    const { data: user } = useCurrentUser();
    const { t } = useTranslation();
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && user?.role !== 'manager') return null;
    return (
        <nav aria-label={t('ordersDesign.adminNav')} className="mb-8 min-w-0 border-b border-border pb-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">{t('ordersDesign.management')}</h2>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{t(isAdmin ? 'ordersDesign.admin' : 'ordersDesign.manager')}</span>
                </div>
                <Link to="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}>
                    {t('ordersDesign.home')}<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
            <div className="flex flex-wrap gap-1">
                {navigationItems.filter(item => !item.adminOnly || isAdmin).map(({ path, key, icon: Icon }) => (
                    <NavLink key={path} to={path} end={path === '/admin'}
                        className={({ isActive }) => cn(
                            'inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isActive ? 'bg-info-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{t('ordersDesign.' + key)}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
