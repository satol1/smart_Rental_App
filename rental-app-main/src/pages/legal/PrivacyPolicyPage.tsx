// src/pages/legal/PrivacyPolicyPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Database, Lock, CheckCircle, AlertCircle, FileText, UserCheck } from "lucide-react";
import { COMPANY_INFO } from "@/lib/companyInfo";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Политика обработки персональных данных"
      subtitle="Настоящая Политика определяет порядок обработки и меры по обеспечению безопасности персональных данных пользователей сервиса проката фототехники «Цифровой» в соответствии с законодательством Российской Федерации."
      badge="152-ФЗ РФ"
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
          <CardContent className="p-5 space-y-3 text-muted-foreground">
            <p>
              1.1. Настоящая Политика обработки персональных данных (далее — «Политика») разработана в строгом соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок сбора, систематизации, накопления, хранения, уточнения, использования, обезличивания, блокирования и уничтожения персональных данных.
            </p>
            <p>
              1.2. Оператором персональных данных является <strong className="text-foreground">{COMPANY_INFO.legalEntity}</strong> (ОГРНИП {COMPANY_INFO.ogrnip}, ИНН {COMPANY_INFO.inn}, адрес: {COMPANY_INFO.address}).
            </p>
            <p>
              1.3. Оператор ставит важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.
            </p>
            <p>
              1.4. Настоящая Политика применяется ко всей информации, которую Оператор может получить о посетителях и пользователях веб-сайта (сервиса) при его использовании.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 2. Основные понятия */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary" />
          2. Основные понятия, используемые в Политике
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-2 text-muted-foreground text-sm">
            <p>• <strong className="text-foreground">Персональные данные</strong> — любая информация, относящаяся к прямо или косвенно определенному или определяемому физическому лицу (субъекту персональных данных).</p>
            <p>• <strong className="text-foreground">Оператор</strong> — государственный орган, муниципальный орган, юридическое или физическое лицо, самостоятельно или совместно с другими лицами организующие и (или) осуществляющие обработку персональных данных.</p>
            <p>• <strong className="text-foreground">Обработка персональных данных</strong> — любое действие (операция) или совокупность действий, совершаемых с использованием средств автоматизации или без таковых.</p>
            <p>• <strong className="text-foreground">Пользователь</strong> — любой посетитель веб-сайта, оставивший свои данные через форму, зарегистрировавшийся или оформивший заказ/бронь оборудования.</p>
            <p>• <strong className="text-foreground">Предоставление персональных данных</strong> — действия, направленные на раскрытие персональных данных определенному лицу или определенному кругу лиц.</p>
            <p>• <strong className="text-foreground">Уничтожение персональных данных</strong> — любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью восстановления.</p>
          </CardContent>
        </Card>
      </section>

      {/* 3. Категории и состав обрабатываемых данных */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Database className="w-5 h-5 text-primary" />
          3. Категории и перечень обрабатываемых данных
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Данные при регистрации и заказе
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Фамилия, имя, отчество</li>
                <li>Номер контактного телефона</li>
                <li>Адрес электронной почты (E-mail)</li>
                <li>Имя пользователя Telegram (при указании)</li>
                <li>Паспортные данные (серия, номер, кем и когда выдан, адрес регистрации — исключительно при составлении официального договора проката оборудования)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-500" />
                Технические и сессионные данные
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>IP-адрес сетевого подключения</li>
                <li>Данные файлов cookie (в рамках авторизации)</li>
                <li>Информация о типе браузера и операционной системы</li>
                <li>Дата, время и реферер сетевого обращения</li>
                <li>История заказов и бронирований техники</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Цели обработки персональных данных */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <UserCheck className="w-5 h-5 text-primary" />
          4. Цели обработки персональных данных
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground">
            <p>Оператор обрабатывает персональные данные Пользователя исключительно для следующих конкретных целей:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Идентификация и регистрация:</strong> предоставление Пользователю доступа к персонализированным сервисам сайта, личному кабинету и истории заказов.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Заключение и исполнение договоров:</strong> бронирование фототехники, оформление договоров проката, актов приема-передачи и финансовых расчетов.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Связь и клиентская поддержка:</strong> направление уведомлений о статусе брони, изменений в графике работы, ответов на запросы и технической поддержки.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-foreground">Безопасность сервиса:</strong> предотвращение мошенничества, защита от несанкционированного доступа (брутфорс, CSRF) и обеспечение стабильности IT-инфраструктуры.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 5. Правовые основания и локализация баз данных */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-primary" />
          5. Правовые основания и требования к хранению данных
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground">
            <p>
              5.1. Правовыми основаниями обработки персональных данных являются: Конституция РФ, Гражданский кодекс РФ (гл. 34 «Аренда», ст. 626–631 «Прокат»), договоры, заключаемые между Оператором и Пользователем, а также согласие Пользователя на обработку его персональных данных.
            </p>
            <p>
              5.2. <strong className="text-foreground">Локализация баз данных (ч. 5 ст. 18 152-ФЗ):</strong> сбор, запись, систематизация, накопление, хранение и уточнение персональных данных граждан РФ осуществляются с использованием баз данных, находящихся исключительно на территории Российской Федерации.
            </p>
            <p>
              5.3. <strong className="text-foreground">Трансграничная передача данных не осуществляется.</strong> Персональные данные Пользователей не передаются на территорию иностранных государств.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 6. Порядок сбора, хранения и уничтожения */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary" />
          6. Порядок сбора, хранения, передачи и уничтожения данных
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground">
            <p>
              6.1. Безопасность персональных данных обеспечивается применением организационных и технических мер (хэширование паролей алгоритмом bcrypt, протокол шифрования TLS/HTTPS, изоляция доступа к базам данных, аудит действий).
            </p>
            <p>
              6.2. Персональные данные Пользователя никогда, ни при каких условиях не будут переданы третьим лицам, за исключением случаев, прямо предусмотренных действующим законодательством РФ (например, по официальному запросу правоохранительных или судебных органов).
            </p>
            <p>
              6.3. Срок обработки персональных данных определяется достижением целей, для которых они были собраны, сроком действия договора проката, либо отзывом согласия Пользователем.
            </p>
            <p>
              6.4. При наступлении оснований для прекращения обработки персональных данных (достижение целей, ликвидация ИП или получение отзыва согласия) данные подлежат уничтожению либо обезличиванию в срок, не превышающий 30 календарных дней.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 7. Права Пользователя и порядок отзыва */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-primary" />
          7. Права Пользователя (субъекта персональных данных)
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground">
            <p>Пользователь имеет право:</p>
            <ul className="space-y-1.5 text-sm list-disc list-inside">
              <li>Получать полную информацию, касающуюся обработки его персональных данных;</li>
              <li>Требовать уточнения своих персональных данных, их блокирования или уничтожения в случае, если данные являются неполными, устаревшими или неточными;</li>
              <li>Отозвать свое согласие на обработку персональных данных в любой момент.</li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-muted/60 border border-border text-foreground text-sm">
              <strong className="block mb-1">Порядок отзыва согласия:</strong>
              Для отзыва согласия на обработку персональных данных Пользователю достаточно отправить соответствующее заявление в свободной форме на адрес электронной почты:{" "}
              <a href={`mailto:${COMPANY_INFO.emails[0]}`} className="text-primary font-medium hover:underline">
                {COMPANY_INFO.emails[0]}
              </a>{" "}
              с пометкой <em>«Отзыв согласия на обработку персональных данных»</em> либо направить письменное уведомление по почтовому адресу Оператора.
            </div>
          </CardContent>
        </Card>
      </section>
    </LegalDocumentLayout>
  );
}
