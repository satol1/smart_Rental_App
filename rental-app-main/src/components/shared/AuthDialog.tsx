// path: rental-app-main/src/components/shared/AuthDialog.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  // <<< ИЗМЕНЕНИЕ: Добавлена функция для закрытия диалога при успешной авторизации
  const handleAuthSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Добро пожаловать!
          </DialogTitle>
          <DialogDescription className="text-center">
            Войдите в аккаунт или зарегистрируйтесь, чтобы продолжить.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AuthForm onSuccess={handleAuthSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}