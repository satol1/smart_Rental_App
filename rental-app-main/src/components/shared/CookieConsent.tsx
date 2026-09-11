// src/components/shared/CookieConsent.tsx

import { Cookie, ExternalLink } from "lucide-react";
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
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl motion-safe:animate-in motion-safe:fade-in duration-base"
        role="dialog"
        aria-label="Согласие на обработку cookie"
      >
        <Card className="border-0 bg-card shadow-popover">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Иконка и текст */}
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 flex-shrink-0">
                  <Cookie className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Мы используем файлы cookie, чтобы вам было удобнее пользоваться сайтом. Используя наш сайт, вы соглашаетесь с нашей{" "}
                    <button
                      type="button"
                      onClick={() => setShowCookiePolicyModal(true)}
                      className="text-primary underline decoration-primary/40 hover:decoration-primary font-medium"
                    >
                      политикой в отношении файлов cookie
                    </button>
                    {" "}
                    <a
                      href="/cookies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 ml-0.5"
                      title="Открыть политику cookie на отдельной странице"
                    >
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                    .
                  </p>
                </div>
              </div>

              {/* Кнопка действия */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
                <Button
                  onClick={acceptCookies}
                  className="w-full sm:w-auto"
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

