import { CalendarDays, SlidersHorizontal, ShoppingCart, ClipboardList, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/useProfile";
import StepCard from "@/components/how-it-works/StepCard";
import AuthCallToAction from "@/components/how-it-works/AuthCallToAction";
import { Card, CardContent } from "@/components/ui/card";
import { USER_STATUS, MAX_RESERVATIONS_BY_STATUS, EDIT_RESTRICTION_DAYS } from "@/constants/userStatusConstants";

export default function HowItWorksPage() {
  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;

  // Данные для всех шагов с цветовыми схемами
  const allSteps = [
    {
      icon: CalendarDays,
      stepNumber: 1,
      title: "Выберите даты",
      description: "Укажите даты начала и окончания аренды. Наш умный календарь автоматически рассчитает количество тарифицируемых дней, исключая выходные.",
      colorScheme: 'blue' as const
    },
    {
      icon: SlidersHorizontal,
      stepNumber: 2,
      title: "Найдите свое оборудование",
      description: "Используйте поиск и умные фильтры по типу, бренду и подборкам (ассоциациям), чтобы быстро найти то, что вам нужно. Включите опцию 'Только доступное' для мгновенной проверки.",
      colorScheme: 'green' as const
    },
    {
      icon: ShoppingCart,
      stepNumber: 3,
      title: "Сформируйте резерв",
      description: "Добавляйте оборудование и необходимые аксессуары к нему в корзину резерва. Вы увидите итоговую стоимость с учетом всех скидок в реальном времени.",
      colorScheme: 'purple' as const
    },
    {
      icon: ClipboardList,
      stepNumber: 4,
      title: "Управляйте заказами",
      description: "Все ваши резервы и аренды находятся в разделе 'Мои заказы'. Вы можете легко редактировать, отменять или повторять свои заказы.",
      colorScheme: 'orange' as const
    }
  ];

  // Для неавторизованных пользователей показываем только первые 2 шага
  const stepsToShow = isAuthenticated ? allSteps : allSteps.slice(0, 2);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Заголовок страницы */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl sm:text-[2.75rem] font-semibold leading-tight text-foreground mb-4">
            Как это работает: Ваш гид по аренде
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
            {isAuthenticated 
              ? "Четыре простых шага к идеальной съемке"
              : "Два простых шага для начала работы с нашим сервисом"
            }
          </p>
        </div>

        {/* Сетка шагов */}
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border mb-12">
          {stepsToShow.map((step) => (
            <StepCard
              key={step.stepNumber}
              icon={step.icon}
              stepNumber={step.stepNumber}
              title={step.title}
              description={step.description}
              colorScheme={step.colorScheme}
            />
          ))}
        </div>

        {/* CTA блок для неавторизованных пользователей */}
        {!isAuthenticated && (
          <div className="max-w-4xl mx-auto">
            <AuthCallToAction />
          </div>
        )}

        {/* Дополнительная информация для авторизованных пользователей */}
        {isAuthenticated && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Готовы начать?
              </h2>
              <p className="text-muted-foreground mb-6">
                Теперь вы знаете, как работает наш сервис. Переходите к каталогу оборудования 
                и начните создавать свой первый резерв!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/" 
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Перейти к каталогу
                </a>
                <a 
                  href="/calendar" 
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Посмотреть календарь
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Блок с информацией о статусах пользователей */}
        {isAuthenticated && (
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-foreground" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Система статусов пользователей
                  </h3>
                </div>
                <p className="text-foreground mb-4">
                  Ваш статус определяет возможности по работе с резервами. Статус автоматически повышается при успешных арендах.
                </p>
                
                <div className="space-y-4">
                  {/* Статус "Новый" */}
                  <div className="border-b border-border py-5 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                        {USER_STATUS.NEW}
                      </div>
                      <span className="text-sm text-muted-foreground">(по умолчанию для новых пользователей)</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span>Максимум <strong>{MAX_RESERVATIONS_BY_STATUS[USER_STATUS.NEW]}</strong> активных резерва одновременно</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <span>Редактирование и отмена резерва возможны только за <strong>более чем {EDIT_RESTRICTION_DAYS[USER_STATUS.NEW]} дня</strong> до начала</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>После <strong>3 успешных аренд</strong> статус автоматически повышается до "Постоянный"</span>
                      </li>
                    </ul>
                  </div>

                  {/* Статус "Постоянный" */}
                  <div className="border-b border-border py-5 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-1 bg-info-soft text-primary text-xs font-medium rounded">
                        {USER_STATUS.REGULAR}
                      </div>
                      <span className="text-sm text-muted-foreground">(от 3 успешных аренд)</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span>Максимум <strong>{MAX_RESERVATIONS_BY_STATUS[USER_STATUS.REGULAR]}</strong> активных резервов одновременно</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <span>Редактирование и отмена резерва возможны только за <strong>более чем {EDIT_RESTRICTION_DAYS[USER_STATUS.REGULAR]} день</strong> до начала</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span>После <strong>7 успешных аренд</strong> статус автоматически повышается до "VIP"</span>
                      </li>
                    </ul>
                  </div>

                  {/* Статус "VIP" */}
                  <div className="border-b border-border py-5 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-1 bg-collection-sky text-pastel-sky-fg text-xs font-medium rounded">
                        {USER_STATUS.VIP}
                      </div>
                      <span className="text-sm text-muted-foreground">(от 7 успешных аренд)</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span>Максимум <strong>{MAX_RESERVATIONS_BY_STATUS[USER_STATUS.VIP]}</strong> активных резервов одновременно</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span><strong>Нет ограничений</strong> на редактирование и отмену резервов</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-warning-soft border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning">
                    <strong>Важно:</strong> Если вы не можете отредактировать или отменить резерв самостоятельно, 
                    обратитесь к менеджеру через кнопку "Написать менеджеру" в карточке резерва.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Блок с ссылкой на правила */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="bg-muted border-border">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Важная информация
              </h3>
              <p className="text-warning mb-4">
                Перед началом работы рекомендуем ознакомиться с нашими правилами аренды
              </p>
              <a 
                href="/rules" 
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Прочитать правила
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
