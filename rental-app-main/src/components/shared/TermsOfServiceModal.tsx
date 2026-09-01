import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Shield, Clock, CreditCard, AlertTriangle, CheckCircle, User, Calendar, Phone, Mail, MapPin, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TermsOfServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TermsOfServiceModal({ open, onOpenChange }: TermsOfServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            Условия использования сервиса
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Общие положения */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              1. Общие положения
            </h2>
            
            <Card className="mb-4">
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Настоящие Условия использования сервиса (далее — «Условия») регулируют отношения между ИП Садомцев Анатолий Юрьевич (далее — «Компания», «мы») и пользователями сервиса аренды фототехники (далее — «Пользователь», «вы»).
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Использование сервиса означает ваше полное согласие с настоящими Условиями. Если вы не согласны с какими-либо положениями, пожалуйста, не используйте наш сервис.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Описание сервиса */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Camera className="w-6 h-6 text-purple-600" />
              2. Описание сервиса
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Smart Rental — это сервис аренды профессиональной фототехники, который позволяет пользователям:
                  </p>
                  <ul className="text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Просматривать каталог доступного оборудования</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Оформлять резервации и аренду оборудования</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Управлять своими заказами и резервациями</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Получать техническую поддержку</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span>Участвовать в программах лояльности и акциях</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Регистрация и аккаунт */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <User className="w-6 h-6 text-green-600" />
              3. Регистрация и аккаунт пользователя
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Требования к регистрации
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Возраст не менее 18 лет</li>
                    <li>• Предоставление достоверных персональных данных (ФИО, дата рождения, телефон, email)</li>
                    <li>• Подтверждение номера телефона</li>
                    <li>• Согласие с Политикой обработки персональных данных</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Ответственность за аккаунт
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Вы несете ответственность за сохранность данных доступа</li>
                    <li>• Обязаны немедленно уведомить о компрометации аккаунта</li>
                    <li>• Не можете передавать аккаунт третьим лицам</li>
                    <li>• Обязаны поддерживать актуальность персональных данных</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Условия аренды */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-orange-600" />
              4. Условия аренды оборудования
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Порядок оформления аренды
                  </h3>
                  <ol className="text-gray-600 space-y-2 text-sm list-decimal list-inside">
                    <li>Выбор оборудования и дат аренды</li>
                    <li>Оформление резервации через сайт или приложение</li>
                    <li>Подтверждение заказа менеджером</li>
                    <li>Оплата аренды и залога</li>
                    <li>Подписание договора аренды</li>
                    <li>Получение оборудования</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Оплата и залог
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Оплата производится в полном объеме до получения оборудования</li>
                    <li>• Залог составляет 50-100% от стоимости оборудования</li>
                    <li>• Залог возвращается при возврате оборудования в исправном состоянии</li>
                    <li>• Принимаются карты Visa, MasterCard, МИР</li>
                    <li>• Возможна оплата наличными при получении</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Сроки и условия возврата
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Оборудование должно быть возвращено до 13:00 дня окончания аренды</li>
                    <li>• При возврате после 15:00 засчитывается дополнительный день</li>
                    <li>• Воскресенье не тарифицируется при аренде на выходные</li>
                    <li>• Оборудование должно быть в том же состоянии, что и при получении</li>
                    <li>• При повреждении взимается стоимость ремонта или замены</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ограничения и запреты */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              5. Ограничения и запреты
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Запрещенные действия:</h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Использование оборудования в коммерческих целях без согласования</li>
                      <li>• Разборка, модификация или ремонт оборудования</li>
                      <li>• Использование оборудования в экстремальных условиях</li>
                      <li>• Передача оборудования третьим лицам без письменного разрешения</li>
                      <li>• Нарушение авторских прав при использовании оборудования</li>
                      <li>• Использование оборудования для незаконной деятельности</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Последствия нарушений:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• Немедленное расторжение договора аренды</li>
                      <li>• Взыскание полной стоимости оборудования</li>
                      <li>• Запрет на дальнейшее использование сервиса</li>
                      <li>• Обращение в правоохранительные органы при необходимости</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ответственность */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              6. Ответственность сторон
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Ответственность пользователя
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Полная материальная ответственность за сохранность оборудования</li>
                    <li>• Соблюдение сроков возврата</li>
                    <li>• Использование оборудования по назначению</li>
                    <li>• Своевременное уведомление о технических неполадках</li>
                    <li>• Возмещение ущерба при повреждении или утере</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Ответственность компании
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Предоставление исправного оборудования</li>
                    <li>• Обеспечение технической поддержки</li>
                    <li>• Соблюдение сроков предоставления услуг</li>
                    <li>• Защита персональных данных пользователей</li>
                    <li>• Возврат залога при соблюдении условий договора</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Отмена и возврат */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              7. Отмена заказов и возврат средств
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Отмена заказа</h3>
                      <ul className="text-gray-600 space-y-2 text-sm">
                        <li>• За 24+ часов: полный возврат</li>
                        <li>• За 12-24 часа: возврат 50%</li>
                        <li>• Менее 12 часов: возврат 25%</li>
                        <li>• В день получения: возврат невозможен</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Возврат средств</h3>
                      <ul className="text-gray-600 space-y-2 text-sm">
                        <li>• На карту: 3-5 рабочих дней</li>
                        <li>• Наличными: при возврате оборудования</li>
                        <li>• Залог: в течение 24 часов</li>
                        <li>• Комиссия банка: за счет получателя</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Техническая поддержка */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Phone className="w-6 h-6 text-green-600" />
              8. Техническая поддержка
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Способы связи</h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Телефон: +7 (8512) 39-28-88</li>
                      <li>• Email: 392888@digital30.ru</li>
                      <li>• Онлайн-чат на сайте</li>
                      <li>• Telegram: @smartrental_support</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Время работы</h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Пн-Пт: 9:00 - 21:00</li>
                      <li>• Сб-Вс: 10:00 - 20:00</li>
                      <li>• Экстренная поддержка: 24/7</li>
                      <li>• Среднее время ответа: 15 минут</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Контактная информация */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-600" />
              9. Контактная информация
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      Адрес
                    </h3>
                    <p className="text-gray-600 text-sm">
                      ИП Садомцев Анатолий Юрьевич<br />
                      414000, г. Астрахань, ул. Володарского, д. 14а
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-600" />
                      Контакты
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Телефон: +7 (8512) 39-28-88, +7 (908) 617-71-77</p>
                      <p>Email: 392888@digital30.ru, info@digital30.ru</p>
                      <p>Сайт: https://smartrental.ru</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Реквизиты</h4>
                  <div className="text-gray-600 text-sm space-y-1">
                    <p>ИНН: 301804783922</p>
                    <p>Свидетельство предпринимателя: 324300000045680 от 25 сентября 2024</p>
                    <p>Банк: ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)</p>
                    <p>БИК: 044525411</p>
                    <p>Р/С: 40802810706470005615</p>
                    <p>К/С: 30101810145250000411</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Заключительные положения */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-600" />
              10. Заключительные положения
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Если какое-либо положение настоящих Условий будет признано недействительным, остальные положения сохраняют свою силу.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed">
                    Настоящие Условия вступают в силу с момента их принятия пользователем и действуют до момента их отзыва или изменения.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">
                      <strong>Дата вступления в силу:</strong> 15 ноября 2025 г.<br />
                      <strong>Версия документа:</strong> 2.1<br />
                      <strong>Предыдущая версия:</strong> 2.0 от 01.10.2025
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
