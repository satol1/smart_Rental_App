// path: rental-app-main/src/components/shared/AuthDialog.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import AuthForm from "@/components/AuthForm";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Модальное окно для аутентификации,
 * которое использует существующий компонент AuthForm.
 */
export default function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const { t } = useTranslation();
  // <<< ИЗМЕНЕНИЕ: Добавлена функция для закрытия диалога при успешной авторизации
  const handleAuthSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {t("auth.welcomeTitle")}
          </DialogTitle>
          <DialogDescription className="max-w-md">
            {t("auth.welcomeDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-1">
          <AuthForm embedded onSuccess={handleAuthSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}