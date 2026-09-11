import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, FileText, Eye, Lock, Database, CheckCircle, Phone, MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANY_INFO } from "@/lib/companyInfo";


interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            Политика обработки персональных данных
          </DialogTitle>
          <div className="text-center pt-1 mb-2">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть на отдельной странице (/privacy)
            </a>
          </div>
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
                  Настоящая Политика обработки персональных данных (далее — «Политика») разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и действующим законодательством Российской Федерации.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Оператором персональных данных является ИП Садомцев Анатолий Юрьевич (далее — «Оператор», «Компания»), осуществляющий обработку персональных данных пользователей сервиса аренды фототехники.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Цели обработки */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6 text-green-600" />
              2. Цели обработки персональных данных
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Основные цели
                </h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Предоставление услуг аренды фототехники</li>
                  <li>• Оформление договоров аренды и сопутствующих документов</li>
                  <li>• Обработка заявок и резерваций оборудования</li>
                  <li>• Ведение клиентской базы и истории аренды</li>
                  <li>• Обеспечение технической поддержки пользователей</li>
                  <li>• Информирование о новых услугах и акциях</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Категории персональных данных */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-600" />
              3. Категории обрабатываемых персональных данных
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Обязательные данные
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Фамилия, имя, отчество</li>
                    <li>• Дата рождения</li>
                    <li>• Номер телефона</li>
                    <li>• Адрес электронной почты</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-600" />
                    Дополнительные данные
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• История аренды и предпочтения в оборудовании</li>
                    <li>• Данные о платежах и финансовых операциях</li>
                    <li>• IP-адрес и данные о браузере (технические данные)</li>
                    <li>• Данные о взаимодействии с сайтом и приложением</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Правовые основания */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-600" />
              4. Правовые основания обработки персональных данных
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Согласие субъекта персональных данных</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Обработка персональных данных осуществляется на основании согласия субъекта персональных данных, выраженного в письменной форме или в форме электронного документа.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Исполнение договора</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Обработка персональных данных необходима для исполнения договора аренды, стороной которого является субъект персональных данных.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Соблюдение законодательства</h4>
                      <p className="text-gray-600 text-sm mt-1">
                        Обработка персональных данных необходима для соблюдения требований действующего законодательства Российской Федерации.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Меры защиты */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-red-600" />
              5. Меры по защите персональных данных
            </h2>
            
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Технические меры
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Использование сертифицированных средств защиты информации</li>
                    <li>• Шифрование персональных данных при передаче и хранении</li>
                    <li>• Контроль доступа к информационным системам</li>
                    <li>• Резервное копирование и восстановление данных</li>
                    <li>• Мониторинг и аудит доступа к персональным данным</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Организационные меры
                  </h3>
                  <ul className="text-gray-600 space-y-2 text-sm">
                    <li>• Назначение ответственного за обработку персональных данных</li>
                    <li>• Обучение сотрудников правилам работы с персональными данными</li>
                    <li>• Ограничение доступа к персональным данным</li>
                    <li>• Контроль соблюдения требований по защите данных</li>
                    <li>• Регулярное обновление политики безопасности</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Права субъектов */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              6. Права субъектов персональных данных
            </h2>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Основные права</h4>
                      <ul className="text-gray-600 space-y-2 text-sm">
                        <li>• Право на получение информации об обработке</li>
                        <li>• Право на доступ к персональным данным</li>
                        <li>• Право на уточнение и исправление данных</li>
                        <li>• Право на удаление персональных данных</li>
                        <li>• Право на отзыв согласия на обработку</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Дополнительные права</h4>
                      <ul className="text-gray-600 space-y-2 text-sm">
                        <li>• Право на ограничение обработки</li>
                        <li>• Право на портабельность данных</li>
                        <li>• Право на возражение против обработки</li>
                        <li>• Право на обращение в Роскомнадзор</li>
                        <li>• Право на судебную защиту</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Контактная информация */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Phone className="w-6 h-6 text-blue-600" />
              7. Контактная информация
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
                      <p>Телефон: {COMPANY_INFO.phones.join(', ')}</p>
                      <p>Email: {COMPANY_INFO.emails.join(', ')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Ответственный за обработку персональных данных</h4>
                  <p className="text-blue-700 text-sm">
                    Садомцев Анатолий Юрьевич<br />
                    Email: {COMPANY_INFO.emails[0]}<br />
                    Телефон: {COMPANY_INFO.phones.join(', ')}
                  </p>
                </div>
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
                    Настоящая Политика может быть изменена Оператором в одностороннем порядке. При внесении изменений в актуальной редакции указывается дата последнего обновления. Новая редакция Политики вступает в силу с момента ее размещения на сайте, если иное не предусмотрено новой редакцией Политики.
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
