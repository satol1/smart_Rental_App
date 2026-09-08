import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText, HelpCircle, Menu, Send, X, BookOpen } from 'lucide-react';
import BrandLogo from '@/components/shared/BrandLogo';
import { useCurrentUser } from '@/hooks/useProfile';
import { useHomePageReset } from '@/hooks/useHomePageReset';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactDialog } from '@/components/shared/ContactDialog';
import AuthDialog from '@/components/shared/AuthDialog';
import { cn } from '@/lib/utils';
import UserNav from './UserNav';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetHomePage } = useHomePageReset();
  const [isContactOpen, setContactOpen] = useState(false);
  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHomePage = location.pathname === '/';

  const links = [
    { to: '/', label: t('shell.catalog'), icon: null },
    { to: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { to: '/how-it-works', label: t('nav.howItWorks'), icon: HelpCircle },
    { to: '/rules', label: t('nav.ourRules'), icon: BookOpen },
  ];

  const openContact = () => {
    setMobileMenuOpen(false);
    setContactOpen(true);
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setMobileMenuOpen(false);
    if (isHomePage) {
      event.preventDefault();
      resetHomePage();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            onClick={handleLogoClick}
            aria-label={isHomePage ? t('nav.resetFilters') : t('nav.goHome')}
            className="group inline-flex min-h-11 shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <BrandLogo size={44} />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label={t('shell.navigation')}>
            {links.map(({ to, label }) => (
              <NavLink
                key={to} to={to} end={to === '/'}
                className={({ isActive }) => cn(
                  'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                )}
              >
                {label}
              </NavLink>
            ))}
            <Button variant="ghost" onClick={openContact} className="text-muted-foreground">{t('nav.contact')}</Button>
          </nav>

          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden sm:block"><ThemeSwitcher /></div>
            {isLoading ? (
              <Skeleton className="h-11 w-11 rounded-full sm:w-24 sm:rounded-lg" />
            ) : user ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate('/reservations/my')}
                  className="hidden md:inline-flex"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('nav.myOrders')}
                </Button>
                <UserNav />
              </>
            ) : (
              <Button onClick={() => setAuthDialogOpen(true)} className="px-4 sm:px-5">
                {t('shell.login')}
              </Button>
            )}
            <Popover open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost" size="icon" className="xl:hidden"
                  aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-navigation"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={16} className="w-[min(22rem,calc(100vw-2rem))] p-2 xl:hidden">
                <nav id="mobile-navigation" aria-label={t('shell.navigation')} className="grid gap-1">
                  {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to} to={to} end={to === '/'} onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                      {label}
                    </NavLink>
                  ))}
                  {user && (
                    <NavLink
                      to="/reservations/my" onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring', isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />{t('nav.myOrders')}
                    </NavLink>
                  )}
                  <Button variant="ghost" onClick={openContact} className="justify-start gap-3 px-3 text-muted-foreground">
                    <Send className="h-4 w-4" aria-hidden="true" />{t('nav.contact')}
                  </Button>
                  <div className="mt-1 flex items-center justify-end border-t border-border px-1 pt-2 sm:hidden">
                    <ThemeSwitcher />
                  </div>
                </nav>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
      <ContactDialog open={isContactOpen} onOpenChange={setContactOpen} />
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}
