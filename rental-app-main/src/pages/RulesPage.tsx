import { Shield, Clock, CreditCard, AlertTriangle, CheckCircle, FileText, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_INFO } from "@/lib/companyInfo";


export default function RulesPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Заголовок страницы */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl sm:text-4.5xl font-semibold leading-tight text-foreground mb-4">
            Наши правила
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
            Важные условия аренды фототехники, которые помогут сделать сотрудничество комфортным и безопасным
          </p>
        </div>

        {/* Важные правила аренды */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-7 h-7 text-foreground" />
            Важные правила аренды
          </h2>
          
          <div className="grid gap-6">
            {/* Правило 1: Залог и паспорт */}
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-foreground" />
                  Оформление договора
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground leading-relaxed">
                  Оборудование выдается под залог и при наличии паспорта для оформления договора.
                </p>
              </CardContent>
            </Card>

            {/* Правило 2: Проверка техники */}
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                  Проверка при получении
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground leading-relaxed">
                  При получении техники обязательно проверьте ее исправность и комплектацию вместе с менеджером.
                </p>
              </CardContent>
            </Card>

            {/* Правило 3: Особые условия расчета */}
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-foreground" />
                  Особые условия расчета
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    Наши арендные сутки — работают почти как в гостинице! Вы забираете технику после 15:00, а возвращаете до 13:00 следующего дня. Два часа нужны нам для подготовки техники следующему клиенту.
                  </p>
                  <div className="bg-success-soft p-4 rounded-md">
                    <p className="text-success font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Приятный бонус: Воскресенье не тарифицируется!
                    </p>
                    <p className="text-success text-sm mt-1">
                      При аренде на выходные (с сб по пн) вы платите только за один день.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Правило 4: Соблюдение сроков */}
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-foreground" />
                  Соблюдение сроков
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground leading-relaxed">
                  Просим вас соблюдать сроки. При возврате оборудования после 15:00 в день возврата будет засчитан следующий полный арендный день.
                </p>
              </CardContent>
            </Card>

            {/* Правило 5: Материальная ответственность */}
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-foreground" />
                  Материальная ответственность
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground leading-relaxed">
                  Арендатор несет полную материальную ответственность за сохранность и исправность техники.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Дополнительные правила */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-muted-foreground" />
            Дополнительные правила
          </h2>
          
          <div className="grid gap-4">
            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Возрастные ограничения
                </h3>
                <p className="text-muted-foreground text-sm">
                  Аренда оборудования возможна лицам, достигшим 18 лет. При аренде несовершеннолетними требуется присутствие законного представителя.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  Страхование
                </h3>
                <p className="text-muted-foreground text-sm">
                  Рекомендуем оформить страховку оборудования на период аренды. В случае повреждения или утери техники страховая компания покроет расходы на ремонт или замену.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  Продление аренды
                </h3>
                <p className="text-muted-foreground text-sm">
                  Продление срока аренды возможно при наличии свободного оборудования и предварительном уведомлении за 24 часа до окончания текущего периода.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                  Отмена и возврат
                </h3>
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Резерв можно отменить или изменить самостоятельно не позднее чем за 3 дня до начала (статус «Новый»), за 2 дня (статус «Постоянный») и в любой момент (статус VIP).
                  </p>
                  <div className="bg-warning-soft p-4 rounded-md">
                    <h4 className="font-semibold text-warning mb-2 text-sm">Условия отмены резерва:</h4>
                    <ul className="text-warning text-xs space-y-1">
                      <li>• В течение 24 часов после создания: бесплатная отмена любого резерва</li>
                      <li>• «Новый»: самостоятельно — не позднее чем за 3 дня до начала</li>
                      <li>• «Постоянный»: самостоятельно — не позднее чем за 2 дня до начала</li>
                      <li>• «VIP»: без ограничений по срокам</li>
                      <li>• Позже указанных сроков: только через менеджера</li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Средства списываются при выдаче оборудования в аренду, поэтому отмена резерва не требует возврата средств.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  Техническая поддержка
                </h3>
                <p className="text-muted-foreground text-sm">
                  В случае технических неполадок в период аренды предоставляется замена оборудования или техническая поддержка в рабочее время.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Документооборот
                </h3>
                <p className="text-muted-foreground text-sm">
                  Все операции оформляются соответствующими документами. Копии договоров и актов приема-передачи сохраняются в течение 3 лет.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
              <CardContent className="p-0">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-foreground" />
                  Запрещенные действия
                </h3>
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    При аренде оборудования строго запрещено:
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1">
                    <li>• Использование в коммерческих целях без согласования</li>
                    <li>• Разборка, модификация или ремонт оборудования</li>
                    <li>• Использование в экстремальных условиях</li>
                    <li>• Передача третьим лицам без письменного разрешения</li>
                    <li>• Нарушение авторских прав при использовании</li>
                  </ul>
                  <div className="bg-danger-soft p-4 rounded-md">
                    <p className="text-foreground text-xs font-semibold">
                      ⚠️ Нарушение правил влечет немедленное расторжение договора и взыскание полной стоимости оборудования
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Контактная информация */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <User className="w-7 h-7 text-foreground" />
            Контактная информация
          </h2>
          
          <Card className="rounded-none border-0 border-b border-border bg-transparent pb-6">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-foreground" />
                    Оператор
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    ИП Садомцев Анатолий Юрьевич<br />
                    414000, г. Астрахань, ул. Володарского, д. 14а
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-success" />
                    Контакты
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Телефон: {COMPANY_INFO.phones.join(', ')}</p>
                    <p>Email: {COMPANY_INFO.emails.join(', ')}</p>
                    <p>Время работы: Пн-Пт 9:00-21:00, Сб-Вс 10:00-20:00</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-semibold text-foreground mb-2">Реквизиты</h4>
                <div className="text-muted-foreground text-sm space-y-1">
                  <p>ИНН: 301804783922</p>
                  <p>Свидетельство предпринимателя: 324300000045680 от 25 сентября 2024</p>
                  <p>Банк: ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)</p>
                  <p>Р/С: 40802810706470005615</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Информационный блок */}
        <Card className="bg-card border-border p-6">
          <CardContent className="p-0">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Остались вопросы?
              </h3>
              <p className="text-foreground mb-4">
                Наша команда всегда готова помочь и ответить на любые вопросы по правилам аренды
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="/" 
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Вернуться к каталогу
                </a>
                <a 
                  href="/how-it-works" 
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Как это работает
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
