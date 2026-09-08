// src/components/layout/ThemeSwitcher.tsx
// Переключатель темы в хедере: Светлое / Тёмное / Системное.
// Построен на существующем Radix Popover из ui/ (dropdown-menu в проекте отсутствует).

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore, type Theme } from "@/store/themeStore";
import { listItem, motionSafeVariants, springs, staggerContainer, transitionFast } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MotionButton = motion(Button);

const THEME_OPTIONS: Array<{
  value: Theme;
  labelKey: string;
  icon: typeof Sun;
}> = [
  { value: "light", labelKey: "nav.themeLight", icon: Sun },
  { value: "dark", labelKey: "nav.themeDark", icon: Moon },
  { value: "system", labelKey: "nav.themeSystem", icon: Monitor },
];

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;
  const activeKey = resolvedTheme === "dark" ? "moon" : "sun";

  const handleSelect = (next: Theme) => {
    setTheme(next);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <MotionButton
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("nav.themeLabel", { theme: t(THEME_OPTIONS.find((o) => o.value === theme)?.labelKey ?? "nav.themeSystem") })}
          title={t("nav.themeTitle")}
          whileTap={reducedMotion ? undefined : { scale: 0.9 }}
          transition={springs.press}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={activeKey}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: -45, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 45, scale: 0.7 }}
              transition={transitionFast}
              className="grid place-items-center"
            >
              <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            </motion.span>
          </AnimatePresence>
        </MotionButton>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <motion.div
          className="space-y-0.5"
          initial="hidden"
          animate="visible"
          variants={motionSafeVariants(reducedMotion, staggerContainer)}
        >
          {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
            const isActive = theme === value;
            return (
              <motion.div key={value} variants={motionSafeVariants(reducedMotion, listItem)}>
                <button
                  type="button"
                  onClick={() => handleSelect(value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-base",
                    "hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(labelKey)}
                  </span>
                  {isActive && (
                    <motion.span
                      initial={reducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={reducedMotion ? transitionFast : springs.pop}
                    >
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    </motion.span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
