// src/pages/legal/CookiePolicyPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, ShieldAlert, Cpu, Settings2, HelpCircle } from "lucide-react";
import { COMPANY_INFO } from "@/lib/companyInfo";

export default function CookiePolicyPage() {
  return (
    <LegalDocumentLayout
      title="Политика в отношении файлов cookie"
      subtitle="Информация о том, какие файлы cookie и локальные хранилища используются на сайте сервиса «Цифровой», для каких целей и как ими управлять."
      badge="Файлы cookie"
      version="2.1"
      effectiveDate="10 января 2026 г."
    >
      {/* 1. Что такое файлы cookie */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Cookie className="w-5 h-5 text-primary" />
          1. Что такое файлы cookie и для чего они используются
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              1.1. Файлы cookie (куки) — это небольшие текстовые фрагменты данных, сохраняемые вашим веб-браузером на устройстве (компьютере, смартфоне, планшете) при посещении веб-сайта.
            </p>
            <p>
              1.2. Оператор <strong className="text-foreground">{COMPANY_INFO.legalEntity}</strong> использует файлы cookie и веб-хранилище (localStorage) для обеспечения стабильной и безопасной работы сервиса, сохранения параметров сессии и авторизации, а также для сохранения настроек интерфейса (например, светлой или темной темы).
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 2. Категории используемых файлов cookie */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-primary" />
          2. Категории используемых cookie
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                Строго технические и сессионные
              </h3>
              <p className="text-xs text-muted-foreground">Обязательны для функционирования сайта</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">access_token / session</strong> — обеспечение безопасного входа и доступа к личному кабинету;</li>
                <li><strong className="text-foreground">csrf_token</strong> — защита от межсайтовой подделки запросов (CSRF-атак);</li>
                <li><strong className="text-foreground">cookie_consent</strong> — сохранение вашего решения по баннеру согласия с cookie.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-500" />
                Функциональные и настройки интерфейса
              </h3>
              <p className="text-xs text-muted-foreground">Улучшают удобство работы с каталогом</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">theme</strong> — сохранение выбранной цветовой темы (темная / светлая);</li>
                <li><strong className="text-foreground">catalog_dates</strong> — сохранение выбранного диапазона дат аренды между страницами;</li>
                <li><strong className="text-foreground">cart_state</strong> — временное сохранение выбранных единиц оборудования при бронировании.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Как управлять и отключить cookie */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-primary" />
          3. Управление файлами cookie и их отключение
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              3.1. Большинство современных браузеров автоматически принимают файлы cookie, однако Пользователь имеет возможность в любой момент изменить настройки безопасности в своем браузере: заблокировать прием файлов cookie, удалить уже сохраненные файлы или настроить уведомление о каждой попытке их записи.
            </p>
            <div className="p-4 rounded-lg bg-muted/60 border border-border text-xs sm:text-sm space-y-1.5 text-foreground">
              <p className="font-medium">Инструкции для популярных браузеров:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Яндекс.Браузер:</strong> Настройки → Сайты → Расширенные настройки сайтов → Cookie-файлы;</li>
                <li><strong>Google Chrome:</strong> Настройки → Конфиденциальность и безопасность → Файлы cookie сторонних сайтов;</li>
                <li><strong>Mozilla Firefox:</strong> Настройки → Приватность и защита → Куки и данные сайтов;</li>
                <li><strong>Apple Safari:</strong> Настройки → Конфиденциальность → Блокировать все cookie.</li>
              </ul>
            </div>
            <p className="text-amber-500 text-sm font-medium pt-1">
              Обратите внимание: отключение строго технических файлов cookie сделает невозможным вход в личный кабинет и оформление онлайн-бронирования оборудования, поскольку механизмы аутентификации зависят от данных сессии.
            </p>
          </CardContent>
        </Card>
      </section>
    </LegalDocumentLayout>
  );
}
