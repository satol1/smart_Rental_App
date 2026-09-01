import { useState } from "react";
import { UserPlus } from "lucide-react";
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
      <Card className={cn("bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Иконка */}
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-10 h-10 text-sky-600" />
            </div>
            
            {/* Заголовок */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                Раскройте все возможности
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed max-w-md">
                Войдите или зарегистрируйтесь, чтобы добавлять оборудование в резерв, 
                сохранять заказы и управлять ими в личном кабинете.
              </p>
            </div>
            
            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button 
                onClick={() => setAuthDialogOpen(true)}
                className="flex-1 h-12 text-base font-medium bg-sky-600 hover:bg-sky-700 text-white"
              >
                Войти
              </Button>
              <Button 
                onClick={() => setAuthDialogOpen(true)}
                variant="outline"
                className="flex-1 h-12 text-base font-medium border-sky-300 text-sky-700 hover:bg-sky-50"
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
