import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
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
import { listItem, motionSafeVariants, springs, transitionFast } from '@/lib/motion';
import UserNav from './UserNav';
import ThemeSwitcher from './ThemeSwitcher';

const MotionButton = motion(Button);

/** Компактное состояние шапки включается после небольшого скролла. */
export function useHeaderScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

const menuPanelVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springs.pop, staggerChildren: 0.045, delayChildren: 0.04 },
  },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: transitionFast },
};

const menuPanelReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionFast },
  exit: { opacity: 0, transition: transitionFast },
};

const navLinkClasses = (isActive: boolean) =>
  cn(
    'relative inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium outline-none',
    'transition-colors duration-base focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'text-accent-foreground'
      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
  );

export default function Header() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { resetHomePage } = useHomePageReset();
  const reducedMotion = useReducedMotion();
  const isScrolled = useHeaderScrolled();
  const [isContactOpen, setContactOpen] = useState(false);
  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHomePage = location.pathname === '/';

  // Deep-link возврат: RequireAuth редиректит неавторизованных на главную с
  // state.from — открываем диалог входа сразу, после входа completeAuth
  // вернёт пользователя на исходный маршрут
  useEffect(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (isHomePage && from) {
      setAuthDialogOpen(true);
    }
  }, [isHomePage, location.state]);

  const links = [
    { to: '/', label: t('shell.catalog'), icon: null },
    { to: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { to: '/how-it-works', label: t('nav.howItWorks'), icon: HelpCircle },
    { to: '/rules', label: t('nav.ourRules'), icon: BookOpen },
  ];

  const tapGesture = reducedMotion ? undefined : { scale: 0.96 };

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
      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-slow',
          isScrolled
            ? 'border-border/70 bg-background/80 shadow-sm backdrop-blur-md'
            : 'border-transparent bg-transparent',
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-[height] duration-slow sm:px-6 lg:px-8',
            isScrolled ? 'h-16' : 'h-20',
          )}
        >
          <Link
            to="/"
            onClick={handleLogoClick}
            aria-label={isHomePage ? t('nav.resetFilters') : t('nav.goHome')}
            className="group inline-flex min-h-11 shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <motion.span
              className="inline-flex origin-left items-center"
              animate={{ scale: isScrolled ? 0.9 : 1 }}
              transition={reducedMotion ? { duration: 0 } : springs.soft}
            >
              <BrandLogo size={44} />
            </motion.span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label={t('shell.navigation')}>
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => navLinkClasses(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId={reducedMotion ? undefined : 'header-nav-pill'}
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={reducedMotion ? { duration: 0 } : springs.soft}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={openContact}
              className={cn(navLinkClasses(false))}
            >
              <span className="relative z-10">{t('nav.contact')}</span>
            </button>
          </nav>

          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden sm:block"><ThemeSwitcher /></div>
            {isLoading ? (
              <Skeleton className="h-11 w-11 rounded-full sm:w-24 sm:rounded-lg" />
            ) : user ? (
              <>
                <MotionButton
                  variant="outline"
                  onClick={() => navigate('/reservations/my')}
                  className="hidden md:inline-flex"
                  whileTap={tapGesture}
                  transition={springs.press}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('nav.myOrders')}
                </MotionButton>
                <UserNav />
              </>
            ) : (
              <MotionButton
                onClick={() => setAuthDialogOpen(true)}
                className="px-4 sm:px-5"
                whileHover={reducedMotion ? undefined : { y: -1 }}
                whileTap={tapGesture}
                transition={springs.press}
              >
                {t('shell.login')}
              </MotionButton>
            )}
            <Popover open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <PopoverTrigger asChild>
                <MotionButton
                  variant="ghost" size="icon" className="rounded-full xl:hidden"
                  aria-label={isMobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-navigation"
                  whileTap={reducedMotion ? undefined : { scale: 0.9 }}
                  transition={springs.press}
                >
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={isMobileMenuOpen ? 'close' : 'menu'}
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -60, scale: 0.7 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 60, scale: 0.7 }}
                      transition={transitionFast}
                      className="grid place-items-center"
                    >
                      {isMobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                    </motion.span>
                  </AnimatePresence>
                </MotionButton>
              </PopoverTrigger>
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <PopoverContent
                    key="mobile-menu"
                    forceMount
                    asChild
                    align="end"
                    sideOffset={12}
                    className="w-[min(22rem,calc(100vw-2rem))] p-2 data-[state=closed]:animate-none data-[state=open]:animate-none xl:hidden"
                  >
                    <motion.nav
                      id="mobile-navigation"
                      aria-label={t('shell.navigation')}
                      className="grid gap-1"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={reducedMotion ? menuPanelReduced : menuPanelVariants}
                    >
                      {links.map(({ to, label, icon: Icon }) => (
                        <motion.div key={to} variants={motionSafeVariants(reducedMotion, listItem)}>
                          <NavLink
                            to={to} end={to === '/'} onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                              'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-ring',
                              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                            )}
                          >
                            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                            {label}
                          </NavLink>
                        </motion.div>
                      ))}
                      {user && (
                        <motion.div variants={motionSafeVariants(reducedMotion, listItem)}>
                          <NavLink
                            to="/reservations/my" onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                              'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-base hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
                              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />{t('nav.myOrders')}
                          </NavLink>
                        </motion.div>
                      )}
                      <motion.div variants={motionSafeVariants(reducedMotion, listItem)}>
                        <Button variant="ghost" onClick={openContact} className="w-full justify-start gap-3 px-3 text-muted-foreground">
                          <Send className="h-4 w-4" aria-hidden="true" />{t('nav.contact')}
                        </Button>
                      </motion.div>
                      <motion.div
                        variants={motionSafeVariants(reducedMotion, listItem)}
                        className="mt-1 flex items-center justify-end border-t border-border px-1 pt-2 sm:hidden"
                      >
                        <ThemeSwitcher />
                      </motion.div>
                    </motion.nav>
                  </PopoverContent>
                )}
              </AnimatePresence>
            </Popover>
          </div>
        </div>
      </header>
      <ContactDialog open={isContactOpen} onOpenChange={setContactOpen} />
      <AuthDialog
            open={isAuthDialogOpen}
            onOpenChange={(open) => {
              setAuthDialogOpen(open);
              if (!open) {
                // Сбрасываем history-state (deep-link from), иначе Back/F5
                // снова откроет диалог входа
                navigate(location.pathname, { replace: true, state: {} });
              }
            }}
          />
    </>
  );
}
