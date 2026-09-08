import { Shield, Clock, CreditCard, AlertTriangle, CheckCircle, FileText, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function RulesPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Заголовок страницы */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Наши правила
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Важные условия аренды фототехники, которые помогут сделать сотрудничество комфортным и безопасным
          </p>
        </div>

        {/* Важные правила аренды */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-600" />
            Важные правила аренды
          </h2>
          
          <div className="grid gap-6">
            {/* Правило 1: Залог и паспорт */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" />
                  Оформление договора
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  Оборудование выдается под залог и при наличии паспорта для оформления договора.
                </p>
              </CardContent>
            </Card>

            {/* Правило 2: Проверка техники */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                  Проверка при получении
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  При получении техники обязательно проверьте ее исправность и комплектацию вместе с менеджером.
                </p>
              </CardContent>
            </Card>

            {/* Правило 3: Особые условия расчета */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Особые условия расчета
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed">
                    Наши арендные сутки — работают почти как в гостинице! Вы забираете технику после 15:00, а возвращаете до 13:00 следующего дня. Два часа нужны нам для подготовки техники следующему клиенту.
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Приятный бонус: Воскресенье не тарифицируется!
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      При аренде на выходные (с сб по пн) вы платите только за один день.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Правило 4: Соблюдение сроков */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  Соблюдение сроков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  Просим вас соблюдать сроки. При возврате оборудования после 15:00 в день возврата будет засчитан следующий полный арендный день.
                </p>
              </CardContent>
            </Card>

            {/* Правило 5: Материальная ответственность */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Материальная ответственность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  Арендатор несет полную материальную ответственность за сохранность и исправность техники.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Дополнительные правила */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <FileText className="w-7 h-7 text-gray-600" />
            Дополнительные правила
          </h2>
          
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Возрастные ограничения
                </h3>
                <p className="text-gray-600 text-sm">
                  Аренда оборудования возможна лицам, достигшим 18 лет. При аренде несовершеннолетними требуется присутствие законного представителя.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  Страхование
                </h3>
                <p className="text-gray-600 text-sm">
                  Рекомендуем оформить страховку оборудования на период аренды. В случае повреждения или утери техники страховая компания покроет расходы на ремонт или замену.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Продление аренды
                </h3>
                <p className="text-gray-600 text-sm">
                  Продление срока аренды возможно при наличии свободного оборудования и предварительном уведомлении за 24 часа до окончания текущего периода.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                  Отмена и возврат
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    Резерв можно отменить или изменить самостоятельно не позднее чем за 3 дня до начала (статус «Новый»), за 2 дня (статус «Постоянный») и в любой момент (статус VIP).
                  </p>
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2 text-sm">Условия отмены резерва:</h4>
                    <ul className="text-yellow-700 text-xs space-y-1">
                      <li>• В течение 24 часов после создания: бесплатная отмена любого резерва</li>
                      <li>• «Новый»: самостоятельно — не позднее чем за 3 дня до начала</li>
                      <li>• «Постоянный»: самостоятельно — не позднее чем за 2 дня до начала</li>
                      <li>• «VIP»: без ограничений по срокам</li>
                      <li>• Позже указанных сроков: только через менеджера</li>
                    </ul>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Средства списываются при выдаче оборудования в аренду, поэтому отмена резерва не требует возврата средств.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                  Техническая поддержка
                </h3>
                <p className="text-gray-600 text-sm">
                  В случае технических неполадок в период аренды предоставляется замена оборудования или техническая поддержка в рабочее время.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Документооборот
                </h3>
                <p className="text-gray-600 text-sm">
                  Все операции оформляются соответствующими документами. Копии договоров и актов приема-передачи сохраняются в течение 3 лет.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Запрещенные действия
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    При аренде оборудования строго запрещено:
                  </p>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Использование в коммерческих целях без согласования</li>
                    <li>• Разборка, модификация или ремонт оборудования</li>
                    <li>• Использование в экстремальных условиях</li>
                    <li>• Передача третьим лицам без письменного разрешения</li>
                    <li>• Нарушение авторских прав при использовании</li>
                  </ul>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-red-700 text-xs font-semibold">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <User className="w-7 h-7 text-blue-600" />
            Контактная информация
          </h2>
          
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Оператор
                  </h3>
                  <p className="text-gray-600 text-sm">
                    ИП Садомцев Анатолий Юрьевич<br />
                    414000, г. Астрахань, ул. Володарского, д. 14а
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Контакты
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Телефон: +7 (8512) 39-28-88, +7 (908) 617-71-77</p>
                    <p>Email: 392888@digital30.ru, info@digital30.ru</p>
                    <p>Время работы: Пн-Пт 9:00-21:00, Сб-Вс 10:00-20:00</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Реквизиты</h4>
                <div className="text-gray-600 text-sm space-y-1">
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
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Остались вопросы?
              </h3>
              <p className="text-blue-700 mb-4">
                Наша команда всегда готова помочь и ответить на любые вопросы по правилам аренды
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="/" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Вернуться к каталогу
                </a>
                <a 
                  href="/how-it-works" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
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
