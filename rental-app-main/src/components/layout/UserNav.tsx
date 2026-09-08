import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { LogOut, Shield, User as UserIcon, ChevronDown } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoneyText } from '@/components/ui/money-text';
import { RoleBadge } from '@/components/ui/role-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { mapLegacyUserStatus } from '@/constants/userStatusConstants';
import { isNegativeBalance } from '@/lib/balanceUtils';
import { listItem, motionSafeVariants, springs, staggerContainer, transitionFast } from '@/lib/motion';
import { cn } from '@/lib/utils';

const MotionButton = motion(Button);

export default function UserNav() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;
  const isManager = user.role === 'admin' || user.role === 'manager';
  const status = mapLegacyUserStatus(user.status);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const itemVariants = motionSafeVariants(reducedMotion, listItem);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <MotionButton
          variant="ghost"
          aria-label={t('shell.account')}
          className="h-11 gap-2 rounded-full px-1.5 sm:px-2"
          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
          transition={springs.press}
        >
          <Avatar
            className={cn(
              'h-8 w-8 transition-shadow duration-base',
              isOpen && 'ring-2 ring-primary/25 ring-offset-2 ring-offset-background',
            )}
          >
            <AvatarFallback className="bg-pastel-sky font-semibold text-pastel-sky-fg">
              {user.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" aria-hidden="true" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium xl:block">{user.full_name}</span>
          <motion.span
            className="hidden sm:block"
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={reducedMotion ? { duration: 0 } : transitionFast}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </motion.span>
        </MotionButton>
      </PopoverTrigger>
      <PopoverContent className="w-[min(19rem,calc(100vw-2rem))] p-2" align="end" sideOffset={12}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={motionSafeVariants(reducedMotion, staggerContainer)}
        >
          <motion.div variants={itemVariants} className="space-y-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              {status && <StatusBadge status={status} />}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">{t('shell.balance')}</span>
              <MoneyText value={user.balance} className={isNegativeBalance(user.balance) ? 'font-semibold text-destructive' : 'font-semibold text-foreground'} />
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="grid gap-1 border-t border-border py-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation('/profile')}>
              <UserIcon className="h-4 w-4" aria-hidden="true" />{t('nav.profile')}
            </Button>
            {isManager && (
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation('/admin')}>
                <Shield className="h-4 w-4" aria-hidden="true" />{t('nav.adminPanel')}
              </Button>
            )}
          </motion.div>
          <motion.div variants={itemVariants} className="border-t border-border pt-2">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-pastel-coral hover:text-pastel-coral-fg" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />{t('nav.logout')}
            </Button>
          </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
