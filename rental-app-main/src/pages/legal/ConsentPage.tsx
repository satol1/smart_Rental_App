// src/pages/legal/ConsentPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, FileSignature, ShieldCheck, Mail, AlertTriangle } from "lucide-react";
import { COMPANY_INFO } from "@/lib/companyInfo";

export default function ConsentPage() {
  return (
    <LegalDocumentLayout
      title="Согласие на обработку персональных данных"
      subtitle="Текст согласия, предоставляемого субъектом персональных данных при регистрации на сайте, оформлении бронирования или заполнении форм обратной связи."
      badge="ст. 9 152-ФЗ РФ"
      version="2.1"
      effectiveDate="10 января 2026 г."
    >
      {/* Преамбула согласия */}
      <section className="space-y-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 space-y-3 text-foreground text-sm sm:text-base leading-relaxed">
            <p>
              Настоящим я (далее — «Пользователь»), действуя свободно, своей волей и в своем интересе, а также подтверждая свою дееспособность, даю свое согласие индивидуальному предпринимателю <strong className="font-semibold">{COMPANY_INFO.legalEntity}</strong> (ОГРНИП {COMPANY_INFO.ogrnip}, ИНН {COMPANY_INFO.inn}, адрес: {COMPANY_INFO.address}, далее — «Оператор») на обработку моих персональных данных на следующих условиях:
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 1. Перечень персональных данных */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <FileSignature className="w-5 h-5 text-primary" />
          1. Перечень персональных данных, на обработку которых дается согласие
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>Согласие дается на обработку следующих персональных данных, не являющихся специальными или биометрическими:</p>
            <ul className="space-y-2 list-disc list-inside text-foreground">
              <li>Фамилия, имя, отчество;</li>
              <li>Номер контактного телефона;</li>
              <li>Адрес электронной почты (e-mail);</li>
              <li>Имя пользователя в мессенджере Telegram (при предоставлении);</li>
              <li>Паспортные данные (серия, номер, орган и дата выдачи, код подразделения, адрес постоянной или временной регистрации) — исключительно при фактическом заключении договора проката оборудования;</li>
              <li>Пользовательские и технические данные: сетевой IP-адрес, источник захода на сайт, данные о браузере и устройстве, пользовательские клики, просмотры страниц и заполнения полей, данные файлов cookie (для обеспечения сессии авторизации).</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 2. Цели обработки */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          2. Цели обработки персональных данных
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>Персональные данные предоставляются и обрабатываются в следующих конкретных целях:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="text-primary font-bold">•</span>
                <span>Регистрация и идентификация Пользователя на сайте сервиса аренды техники «Цифровой», предоставление доступа к Личному кабинету;</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary font-bold">•</span>
                <span>Оформление заявок на резервирование и заключение договоров проката фото- и видеооборудования, актов приема-передачи;</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary font-bold">•</span>
                <span>Связь с Пользователем, направление уведомлений о готовности заказа, бронировании, продлении аренды или возврате техники;</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-primary font-bold">•</span>
                <span>Выполнение Оператором обязательств, предусмотренных законодательством РФ и договором проката.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Перечень действий с персональными данными */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-primary" />
          3. Перечень действий с персональными данными
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              Обработка персональных данных может осуществляться как с использованием средств автоматизации, так и без их использования (смешанная обработка). В ходе обработки Оператор вправе совершать следующие действия:
            </p>
            <p className="text-foreground font-medium">
              Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (в случаях, установленных законом), блокирование, удаление, уничтожение персональных данных.
            </p>
            <p>
              Оператор обязуется не осуществлять продажу, распространение или раскрытие персональных данных третьим лицам без специального согласия, кроме случаев исполнения договоров или законных требований государственных органов РФ.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 4. Срок действия и отзыв согласия */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-primary" />
          4. Срок действия согласия и порядок его отзыва
        </h2>
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-3 text-muted-foreground text-sm sm:text-base">
            <p>
              4.1. Настоящее согласие действует бессрочно с момента его предоставления Пользователем (проставления отметки в чекбоксе на сайте или отправки формы) до момента его отзыва Пользователем или прекращения деятельности Оператора.
            </p>
            <p>
              4.2. Настоящее согласие может быть отозвано Пользователем в любой момент путем направления письменного заявления Оператору на адрес электронной почты:{" "}
              <a href={`mailto:${COMPANY_INFO.emails[0]}`} className="text-primary font-medium hover:underline">
                {COMPANY_INFO.emails[0]}
              </a>{" "}
              с темой письма <em>«Отзыв согласия на обработку персональных данных»</em> либо по почтовому адресу Оператора.
            </p>
            <p>
              4.3. В случае отзыва согласия Оператор вправе продолжить обработку персональных данных без согласия Пользователя при наличии оснований, указанных в пунктах 2–11 части 1 статьи 6 Федерального закона № 152-ФЗ (например, для исполнения действующего договора проката или хранения бухгалтерских документов в соответствии с требованиями законодательства РФ).
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 5. Подтверждение пользователя */}
      <section className="space-y-4">
        <div className="p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-foreground text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Важная информация:</p>
              <p className="text-muted-foreground">
                Проставляя отметку («галочку») в поле <em>«Я даю согласие на обработку персональных данных»</em> при регистрации или оформлении резервирования на сайте digital30.ru, Пользователь подтверждает, что ознакомлен с текстом настоящего Согласия, понимает его значение и дает согласие добровольно и осознанно.
              </p>
            </div>
          </div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
