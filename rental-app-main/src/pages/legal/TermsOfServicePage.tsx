// src/pages/legal/TermsOfServicePage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Camera, User, Shield, Scale } from "lucide-react";
import { COMPANY_INFO } from "@/lib/companyInfo";

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Пользовательское соглашение"
      subtitle="Условия использования веб-сервиса и онлайн-платформы бронирования фототехники «Цифровой»."
      badge="Правила сервиса"
      version="2.1"
      effectiveDate="10 января 2026 г."
    >
      {/* 1. Общие положения */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-primary" />
          1. Общие положения
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              1.1. Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между индивидуальным предпринимателем <strong className="text-foreground">{COMPANY_INFO.legalEntity}</strong> (далее — «Администрация», «Компания») и любым физическим лицом, использующим веб-сервис digital30.ru (далее — «Пользователь»).
            </p>
            <p>
              1.2. Использование сервиса, включая просмотр каталога, регистрацию учетной записи, оформление заявок на резерв или обращение в службу поддержки, означает безоговорочное принятие Пользователем условий настоящего Соглашения.
            </p>
            <p>
              1.3. Если Пользователь не согласен с условиями настоящего Соглашения полностью или в части, он обязан незамедлительно прекратить использование веб-сервиса.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 2. Описание сервиса и назначение */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Camera className="w-5 h-5 text-primary" />
          2. Описание сервиса
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              2.1. Сервис предоставляет Пользователю информационно-техническую платформу для:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-foreground">
              <li>Ознакомления с ассортиментом, техническими характеристиками и тарифами проката фото-, видеооборудования и аксессуаров;</li>
              <li>Проверки занятости и доступности техники на выбранные календарные даты в режиме реального времени;</li>
              <li>Предварительного бронирования (резервирования) выбранного оборудования;</li>
              <li>Управления своими заказами в Личном кабинете и расчета стоимости аренды со скидками.</li>
            </ul>
            <p>
              2.2. Фактическая передача оборудования в пользование оформляется отдельным Договором проката с подписанием акта приема-передачи в соответствии со статьями 626–631 Гражданского кодекса РФ и правилами сервиса, размещенными на странице <a href="/rules" className="text-primary hover:underline">Правила аренды</a>.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 3. Регистрация и безопасность учетной записи */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <User className="w-5 h-5 text-primary" />
          3. Регистрация и безопасность учетной записи
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              3.1. Регистрация на сервисе доступна физическим лицам, достигшим возраста 18 лет и обладающим полной дееспособностью по законодательству РФ.
            </p>
            <p>
              3.2. При регистрации Пользователь обязуется предоставить достоверную, точную и актуальную информацию о себе (ФИО, телефон, e-mail).
            </p>
            <p>
              3.3. Пользователь самостоятельно несет ответственность за сохранение конфиденциальности своих учетных данных (логина и пароля) и за все действия, совершенные в сервисе под его учетной записью.
            </p>
            <p>
              3.4. В случае подозрения на несанкционированный доступ к личному кабинету Пользователь обязан немедленно уведомить Администрацию сервиса по контактам, указанным на сайте.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 4. Права и обязанности сторон */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary" />
          4. Права и обязанности сторон
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <h4 className="font-semibold text-foreground">4.1. Пользователь обязуется:</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Не использовать программные средства для автоматизированного сбора информации (парсинг, скрейпинг, спам-запросы);</li>
              <li>Не предпринимать попыток взлома, подбора паролей, внедрения вредоносного кода или нарушения работоспособности инфраструктуры сервиса;</li>
              <li>Предоставлять подлинные документы при составлении договора проката в пункте выдачи оборудования.</li>
            </ul>

            <h4 className="font-semibold text-foreground pt-2">4.2. Администрация вправе:</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Модифицировать интерфейс, каталог, условия акций и техническую структуру сервиса;</li>
              <li>Приостановить или заблокировать доступ Пользователя в случае выявления злоупотреблений, мошеннических действий или грубого нарушения условий проката;</li>
              <li>Отказать в выдаче оборудования лицам, не предоставившим оригинал паспорта РФ или не выполнившим условия залога.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 5. Ответственность и форс-мажор */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-primary" />
          5. Ограничение ответственности и разрешение споров
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              5.1. Веб-сервис предоставляется на условиях «как есть» («as is»). Администрация принимает все разумные меры для обеспечения бесперебойной и корректной работы сервиса, однако не несет ответственности за временные перебои, вызванные действиями интернет-провайдеров, DDOS-атаками или техническими работами.
            </p>
            <p>
              5.2. Все споры и разногласия стороны стремятся урегулировать путем переговоров и обязательного претензионного порядка. Срок ответа на претензию — 10 рабочих дней. При недостижении согласия спор передается в суд по месту нахождения Оператора в соответствии с законодательством РФ.
            </p>
          </CardContent>
        </Card>
      </section>
    </LegalDocumentLayout>
  );
}
