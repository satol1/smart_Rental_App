// src/pages/legal/MarketingConsentPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, CheckCircle, MailCheck, ShieldCheck, XCircle } from "lucide-react";
import { COMPANY_INFO } from "@/lib/companyInfo";

export default function MarketingConsentPage() {
  return (
    <LegalDocumentLayout
      title="Согласие на получение рекламных и информационных сообщений"
      subtitle="Условия направления информационных и рекламных уведомлений в соответствии с частью 1 статьи 18 Федерального закона № 38-ФЗ «О рекламе»."
      badge="38-ФЗ РФ"
      version="2.0"
      effectiveDate="10 января 2026 г."
    >
      {/* 1. Общие положения */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <BellRing className="w-5 h-5 text-primary" />
          1. Общие положения
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              1.1. В соответствии с частью 1 статьи 18 Федерального закона от 13.03.2006 № 38-ФЗ «О рекламе», распространение рекламы по сетям электросвязи (в том числе посредством использования телефонной, факсимильной, подвижной радиотелефонной связи) допускается только при условии предварительного согласия абонента или адресата на получение рекламы.
            </p>
            <p>
              1.2. Пользователь, проставляя отметку («галочку») в соответствующем поле на веб-сайте digital30.ru или активируя соответствующую опцию в Личном кабинете, дает свое предварительное, информированное и добровольное согласие индивидуальному предпринимателю <strong className="text-foreground">{COMPANY_INFO.legalEntity}</strong> (далее — «Оператор») на получение сообщений информационного и рекламного характера.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 2. Каналы и содержание рассылок */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <MailCheck className="w-5 h-5 text-primary" />
          2. Каналы коммуникации и виды направляемых сообщений
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>Рассылка может осуществляться по следующим каналам связи, предоставленным Пользователем:</p>
            <ul className="space-y-1.5 list-disc list-inside text-foreground">
              <li>Адрес электронной почты (E-mail);</li>
              <li>SMS-сообщения на номер мобильного телефона;</li>
              <li>Сообщения в мессенджере Telegram.</li>
            </ul>

            <h4 className="font-semibold text-foreground pt-2">Виды направляемых материалов:</h4>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Информация о поступлении новинок фото- и видеотехники в парк проката;</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Персональные промокоды, скидки выходного дня и специальные предложения;</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Приглашения на воркшопы, тест-драйвы техники и тематические мероприятия;</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Опросы о качестве обслуживания для улучшения сервиса.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 3. Гарантия добровольности и порядок отказа (отписки) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-primary" />
          3. Добровольность согласия и порядок отказа от рассылок
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              3.1. <strong className="text-foreground">Предоставление настоящего согласия является полностью добровольным</strong> и не является условием регистрации на сайте, использования каталога или оформления аренды техники. Отказ от согласия не ограничивает доступ к услугам сервиса.
            </p>
            <p>
              3.2. Пользователь вправе в любой момент без объяснения причин отозвать свое согласие на получение рекламных сообщений одним из следующих способов:
            </p>
            <div className="p-4 rounded-lg bg-muted/60 border border-border text-sm space-y-2 text-foreground">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span>Кликнув по ссылке <em>«Отписаться от рассылки»</em> в нижней части любого полученного рекламного электронного письма;</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span>Направив запрос в свободной форме на адрес электронной почты: <a href={`mailto:${COMPANY_INFO.emails[0]}`} className="text-primary hover:underline">{COMPANY_INFO.emails[0]}</a> с темой <em>«Отказ от рекламных рассылок»</em>.</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * Обратите внимание: сервисные и транзакционные сообщения (подтверждение бронирования, пароли, уведомления о сроках возврата техники по договору) не являются рекламой и направляются в рамках исполнения договора.
            </p>
          </CardContent>
        </Card>
      </section>
    </LegalDocumentLayout>
  );
}
