// src/pages/legal/LegalDocumentLayout.tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Printer, ShieldCheck, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { COMPANY_INFO } from "@/lib/companyInfo";

interface LegalDocumentLayoutProps {
  title: string;
  subtitle?: string;
  badge?: string;
  effectiveDate?: string;
  version?: string;
  children: ReactNode;
}

export default function LegalDocumentLayout({
  title,
  subtitle,
  badge = "152-ФЗ РФ",
  effectiveDate = "10 января 2026 г.",
  version = "2.0",
  children,
}: LegalDocumentLayoutProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-background min-h-screen text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Верхняя панель навигации */}
        <div className="flex items-center justify-between gap-4 mb-8 print:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться на главную
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs flex items-center gap-1.5"
            title="Распечатать документ"
          >
            <Printer className="w-3.5 h-3.5" />
            Печать
          </Button>
        </div>

        {/* Заголовок документа */}
        <header className="mb-10 pb-6 border-b border-border">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              {badge}
            </span>
            <span className="text-xs text-muted-foreground">
              Версия {version} • Действует с {effectiveDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            {title}
          </h1>

          {subtitle && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </header>

        {/* Основной текст документа */}
        <div className="legal-content space-y-8 text-sm sm:text-base leading-relaxed">
          {children}
        </div>

        {/* Блок реквизитов Оператора */}
        <div className="mt-12 pt-8 border-t border-border">
          <Card className="border border-border bg-card">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Сведения об Операторе
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{COMPANY_INFO.legalEntity}</p>
                  <p>ОГРНИП: {COMPANY_INFO.ogrnip}</p>
                  <p>ИНН: {COMPANY_INFO.inn}</p>
                  <p className="mt-1">{COMPANY_INFO.address}</p>
                </div>
                <div className="space-y-1">
                  <p>Банк: {COMPANY_INFO.bank}</p>
                  <p>Р/С: {COMPANY_INFO.accountNumber}</p>
                  <p className="text-foreground pt-1">
                    E-mail: <a href={`mailto:${COMPANY_INFO.emails[0]}`} className="text-primary hover:underline">{COMPANY_INFO.emails[0]}</a>
                  </p>
                  <p>Тел.: {COMPANY_INFO.phones.join(", ")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
