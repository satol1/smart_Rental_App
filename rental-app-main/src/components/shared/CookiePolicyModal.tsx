import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cookie, FileText, Shield, Lock, Database, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CookiePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CookiePolicyModal({ open, onOpenChange }: CookiePolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-3">
            <Cookie className="w-7 h-7 text-blue-600" />
            Политика в отношении файлов cookie
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
                  Настоящая Политика в отношении файлов cookie (далее — «Политика cookie») разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и действующим законодательством Российской Федерации.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Оператором персональных данных является ИП Садомцев Анатолий Юрьевич (далее — «Оператор», «Компания»), осуществляющий обработку персональных данных пользователей сервиса аренды фототехники с использованием файлов cookie.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Что такое cookie */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Cookie className="w-6 h-6 text-orange-600" />
              2. Что такое файлы cookie
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Файлы cookie — это небольшие текстовые файлы, которые размещаются на вашем устройстве (компьютере, планшете, смартфоне) при посещении веб-сайта. Cookie позволяют сайту запоминать ваши действия и предпочтения на определенный период времени, чтобы вам не приходилось вводить их заново при каждом возвращении на сайт или переходе с одной страницы на другую.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  <p className="text-blue-800 text-sm font-medium mb-2">
                    <Info className="w-4 h-4 inline mr-2" />
                    Мы используем файлы cookie, чтобы вам было удобнее пользоваться сайтом.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Типы используемых cookie */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-600" />
              3. Типы используемых файлов cookie
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Обязательные (технические) cookie
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Эти cookie необходимы для обеспечения безопасности и функциональности сервиса. Они не могут быть отключены в наших системах.
                  </p>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-gray-900">refresh_token</strong> — технический cookie для сохранения сессии пользователя (httpOnly, безопасный). Используется для автоматического обновления токена доступа без повторной авторизации.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-gray-900">fastapi-csrf-token</strong> — технический cookie для защиты от CSRF-атак (Cross-Site Request Forgery). Обеспечивает безопасность при выполнении операций, изменяющих состояние системы.
                      </div>
                    </li>
                  </ul>
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-800 text-xs">
                      <strong>Важно:</strong> Все используемые cookie являются техническими и необходимы для обеспечения безопасности и функциональности сервиса. Без них невозможно использование сайта, включая авторизацию и выполнение операций.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Цели использования cookie */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              4. Цели использования файлов cookie
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Обеспечение безопасности</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Защита от несанкционированного доступа и CSRF-атак, обеспечение безопасной авторизации и работы с персональными данными.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Сохранение сессии пользователя</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Автоматическое обновление токена доступа без необходимости повторной авторизации, обеспечение непрерывности работы с сервисом.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Обеспечение функциональности</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Поддержание работоспособности всех функций сервиса, включая авторизацию, оформление заказов и управление резервациями.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Срок хранения cookie */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-600" />
              5. Срок хранения файлов cookie
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed mb-3">
                  Файлы cookie хранятся на вашем устройстве в течение следующих периодов:
                </p>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• <strong>refresh_token</strong> — до истечения срока действия токена обновления (обычно 30 дней) или до выхода из системы</li>
                  <li>• <strong>fastapi-csrf-token</strong> — в течение сессии или до закрытия браузера</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-3">
                  По истечении указанных сроков cookie автоматически удаляются с вашего устройства.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Управление cookie */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              6. Управление файлами cookie
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Вы можете управлять файлами cookie через настройки вашего браузера. Однако, отключение обязательных (технических) cookie приведет к невозможности использования сервиса, включая авторизацию и выполнение операций.
                </p>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 text-sm font-medium mb-1">
                        Внимание
                      </p>
                      <p className="text-yellow-700 text-sm">
                        Отключение технических cookie сделает невозможным использование сервиса, так как они необходимы для обеспечения безопасности и функциональности. Используя наш сайт, вы соглашаетесь с использованием файлов cookie в соответствии с настоящей Политикой.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правовые основания */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-red-600" />
              7. Правовые основания использования cookie
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-700 leading-relaxed mb-3">
                  Использование файлов cookie осуществляется на следующих правовых основаниях:
                </p>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Согласие субъекта персональных данных (статья 9 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»)</li>
                  <li>• Исполнение договора, стороной которого является субъект персональных данных (статья 6 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»)</li>
                  <li>• Обеспечение безопасности информационных систем (статья 6 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»)</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Заключительные положения */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-600" />
              8. Заключительные положения
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Настоящая Политика cookie может быть изменена Оператором в одностороннем порядке. При внесении изменений в актуальной редакции указывается дата последнего обновления. Новая редакция Политики cookie вступает в силу с момента ее размещения на сайте, если иное не предусмотрено новой редакцией Политики.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">
                      <strong>Дата вступления в силу:</strong> 15 ноября 2025 г.<br />
                      <strong>Версия документа:</strong> 1.0
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

