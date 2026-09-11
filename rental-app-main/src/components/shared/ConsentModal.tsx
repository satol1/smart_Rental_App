// src/components/shared/ConsentModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, FileSignature, ShieldCheck, CheckCircle2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANY_INFO } from "@/lib/companyInfo";

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConsentModal({ open, onOpenChange }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            Согласие на обработку персональных данных
          </DialogTitle>
          <div className="text-center pt-1">
            <a
              href="/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть на отдельной странице (/consent)
            </a>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm sm:text-base">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2 text-foreground text-sm leading-relaxed">
              <p>
                Настоящим Пользователь, действуя свободно, своей волей и в своем интересе, подтверждая свою дееспособность, дает согласие индивидуальному предпринимателю <strong className="font-semibold">{COMPANY_INFO.legalEntity}</strong> (ОГРНИП {COMPANY_INFO.ogrnip}, ИНН {COMPANY_INFO.inn}, адрес: {COMPANY_INFO.address}) на обработку своих персональных данных в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
              </p>
            </CardContent>
          </Card>

          {/* 1. Состав данных */}
          <div>
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              1. Состав персональных данных
            </h3>
            <Card>
              <CardContent className="p-4 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                <p>Согласие распространяется на следующие данные:</p>
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  <li>ФИО, контактный телефон, адрес электронной почты (e-mail);</li>
                  <li>Telegram-аккаунт (при указании);</li>
                  <li>Паспортные данные и адрес регистрации (исключительно при составлении официального договора проката оборудования);</li>
                  <li>Технические данные сетевого сеанса (IP-адрес, файлы cookie сессии).</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 2. Цели */}
          <div>
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              2. Цели обработки
            </h3>
            <Card>
              <CardContent className="p-4 text-xs sm:text-sm text-muted-foreground space-y-1.5">
                <p>• Регистрация и аутентификация в сервисе, доступ к Личному кабинету;</p>
                <p>• Резервирование фотооборудования и оформление договоров проката;</p>
                <p>• Уведомления о статусе бронирования и оперативная связь;</p>
                <p>• Соблюдение обязательных требований законодательства РФ.</p>
              </CardContent>
            </Card>
          </div>

          {/* 3. Действия и отзыв */}
          <div>
            <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              3. Действия с данными и порядок отзыва
            </h3>
            <Card>
              <CardContent className="p-4 text-xs sm:text-sm text-muted-foreground space-y-2">
                <p>
                  Разрешены: сбор, запись, систематизация, накопление, хранение, уточнение, использование, блокирование, удаление и уничтожение данных. Локализация баз данных — строго на территории РФ.
                </p>
                <div className="pt-2 border-t border-border flex items-start gap-2 text-foreground">
                  <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p>
                    Согласие действует до момента его отзыва. Для отзыва направьте письмо на{" "}
                    <a href={`mailto:${COMPANY_INFO.emails[0]}`} className="text-primary hover:underline font-medium">
                      {COMPANY_INFO.emails[0]}
                    </a>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
