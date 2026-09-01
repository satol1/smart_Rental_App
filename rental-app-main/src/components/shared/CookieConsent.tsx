// src/components/shared/CookieConsent.tsx

import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useState } from "react";
import CookiePolicyModal from "./CookiePolicyModal";

/**
 * Компонент согласия на обработку cookie
 * Отображается снизу экрана при первом посещении
 * Информационное сообщение с одной кнопкой "Принять"
 * Соответствует требованиям 152-ФЗ "О персональных данных"
 */
export default function CookieConsent() {
  const { shouldShowBanner, acceptCookies } = useCookieConsent();
  const [showCookiePolicyModal, setShowCookiePolicyModal] = useState(false);
  
  if (!shouldShowBanner) {
    return null;
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-label="Согласие на обработку cookie"
      >
        <Card className="m-4 shadow-lg border-2 border-blue-100 bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Иконка и текст */}
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 flex-shrink-0">
                  <Cookie className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Мы используем файлы cookie, чтобы вам было удобнее пользоваться сайтом. Используя наш сайт, вы соглашаетесь с нашей{" "}
                    <button
                      type="button"
                      onClick={() => setShowCookiePolicyModal(true)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      политикой в отношении файлов cookie
                    </button>
                    .
                  </p>
                </div>
              </div>

              {/* Кнопка действия */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
                <Button
                  onClick={acceptCookies}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  Принять
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Модальное окно политики cookie */}
      <CookiePolicyModal
        open={showCookiePolicyModal}
        onOpenChange={setShowCookiePolicyModal}
      />
    </>
  );
}

