import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/shared/AuthDialog";
import { cn } from "@/lib/utils";

interface AuthCallToActionProps {
  className?: string;
}

export default function AuthCallToAction({ className }: AuthCallToActionProps) {
  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);

  // Функция для обработки успешной авторизации
  const handleAuthSuccess = () => {
    setAuthDialogOpen(false);
    // Перезагружаем страницу для обновления состояния авторизации
    window.location.reload();
  };

  return (
    <>
      <Card className={cn("border-border bg-card", className)}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-start space-y-5">
            {/* Иконка */}

            
            {/* Заголовок */}
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-foreground">
                Раскройте все возможности
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Войдите или зарегистрируйтесь, чтобы добавлять оборудование в резерв, 
                сохранять заказы и управлять ими в личном кабинете.
              </p>
            </div>
            
            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button 
                onClick={() => setAuthDialogOpen(true)}
                className="flex-1"
              >
                Войти
              </Button>
              <Button 
                onClick={() => setAuthDialogOpen(true)}
                variant="outline"
                className="flex-1"
              >
                Зарегистрироваться
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Диалог авторизации */}
      <AuthDialog 
        open={isAuthDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
