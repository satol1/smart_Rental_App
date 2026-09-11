// src/components/shared/LegalDocument.tsx
// Единый рендерер юридических документов из src/content/legal.
// Используется и страницами (через LegalDocumentLayout), и модалками (через LegalDocumentModal).
import type { ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Camera,
  CheckCircle,
  CheckCircle2,
  Cookie,
  Cpu,
  Database,
  Eye,
  FileSignature,
  FileText,
  HelpCircle,
  Lock,
  Clock,
  Mail,
  MailCheck,
  Phone,
  Scale,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { COMPANY_INFO } from "@/lib/companyInfo";
import type {
  LegalBlock,
  LegalCalloutBlock,
  LegalCardsBlock,
  LegalIconName,
  LegalListBlock,
  LegalNoteBlock,
  LegalRichText,
  LegalSection,
} from "@/content/legal";

const SECTION_ICONS: Record<LegalIconName, LucideIcon> = {
  alertCircle: AlertCircle,
  bellRing: BellRing,
  camera: Camera,
  checkCircle: CheckCircle,
  checkCircle2: CheckCircle2,
  clock: Clock,
  cookie: Cookie,
  cpu: Cpu,
  database: Database,
  eye: Eye,
  fileSignature: FileSignature,
  fileText: FileText,
  helpCircle: HelpCircle,
  lock: Lock,
  mail: Mail,
  mailCheck: MailCheck,
  phone: Phone,
  scale: Scale,
  settings2: Settings2,
  shield: Shield,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  user: User,
  userCheck: UserCheck,
};

const CARD_ACCENT_CLASSES: Record<NonNullable<LegalCardsBlock["cards"][number]["accent"]>, string> = {
  primary: "w-4 h-4 text-primary",
  emerald: "w-4 h-4 text-emerald-500",
  sky: "w-4 h-4 text-sky-500",
};

/** Плейсхолдеры {ключ}, подставляемаемые из COMPANY_INFO — реквизиты в контенте не дублируются. */
const COMPANY_PLACEHOLDERS: Record<string, string> = {
  name: COMPANY_INFO.name,
  legalEntity: COMPANY_INFO.legalEntity,
  ogrnip: COMPANY_INFO.ogrnip,
  inn: COMPANY_INFO.inn,
  address: COMPANY_INFO.address,
  email: COMPANY_INFO.emails[0],
  email2: COMPANY_INFO.emails[1],
  phone: COMPANY_INFO.phones[0],
  phones: COMPANY_INFO.phones.join(", "),
  bank: COMPANY_INFO.bank,
  accountNumber: COMPANY_INFO.accountNumber,
  workHours: COMPANY_INFO.workHours,
};

function substitutePlaceholders(text: string): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in COMPANY_PLACEHOLDERS ? COMPANY_PLACEHOLDERS[key] : match,
  );
}

/** **жирный** | *курсив* | [текст](href); основной e-mail автоматически становится mailto-ссылкой. */
const INLINE_TOKEN_RE = /\*\*([^*]+)\*\*|\*(\S(?:[^*]*\S)?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInlineText(text: LegalRichText, keyPrefix: string): ReactNode {
  let prepared = substitutePlaceholders(text);
  const email = COMPANY_INFO.emails[0];
  if (prepared.includes(email)) {
    prepared = prepared.split(email).join(`[${email}](mailto:${email})`);
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  INLINE_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_TOKEN_RE.exec(prepared)) !== null) {
    if (match.index > cursor) {
      parts.push(prepared.slice(cursor, match.index));
    }
    const [, bold, italic, label, href] = match;
    const key = `${keyPrefix}-${index++}`;
    if (bold !== undefined) {
      parts.push(
        <strong key={key} className="font-medium text-foreground">
          {bold}
        </strong>,
      );
    } else if (italic !== undefined) {
      parts.push(<em key={key}>{italic}</em>);
    } else if (label !== undefined && href !== undefined) {
      const external = /^https?:\/\//.test(href);
      parts.push(
        <a
          key={key}
          href={href}
          className="font-medium text-primary hover:underline"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>,
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < prepared.length) {
    parts.push(prepared.slice(cursor));
  }
  return parts.length === 1 ? parts[0] : parts;
}

function renderList(block: LegalListBlock, key: string): ReactNode {
  const variant = block.variant ?? "bullet";
  if (variant === "check") {
    return (
      <ul key={key} className="space-y-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span className="text-sm">{renderInlineText(item, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      key={key}
      className={cn(
        "space-y-1.5 text-sm",
        variant === "number" ? "list-decimal list-inside" : "list-disc list-inside",
      )}
    >
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {renderInlineText(item, `${key}-${i}`)}
        </li>
      ))}
    </ul>
  );
}

function renderNote(block: LegalNoteBlock, key: string): ReactNode {
  return (
    <p
      key={key}
      className={cn(
        "pt-1 text-sm",
        block.tone === "muted" ? "text-xs text-muted-foreground" : "font-medium text-amber-500",
      )}
    >
      {renderInlineText(block.text, key)}
    </p>
  );
}

function renderCallout(block: LegalCalloutBlock, key: string): ReactNode {
  const tone = block.tone ?? "info";

  if (tone === "warning") {
    return (
      <div
        key={key}
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground sm:p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            {block.title && <p className="mb-1 font-semibold">{renderInlineText(block.title, `${key}-t`)}</p>}
            <div className="space-y-2 text-muted-foreground">
              {block.blocks.map((child, i) => renderBlock(child, `${key}-${i}`))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={key}
      className={cn(
        tone === "primary"
          ? "space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-foreground sm:text-base"
          : "space-y-1.5 rounded-lg border border-border bg-muted/60 p-4 text-sm text-foreground",
      )}
    >
      {block.title && (
        <strong className="mb-1 block font-medium">
          {renderInlineText(block.title, `${key}-t`)}
        </strong>
      )}
      {block.blocks.map((child, i) => renderBlock(child, `${key}-${i}`))}
    </div>
  );
}

function renderCards(block: LegalCardsBlock, key: string): ReactNode {
  return (
    <div key={key} className="grid gap-4 sm:grid-cols-2">
      {block.cards.map((card, i) => {
        const Icon = card.icon ? SECTION_ICONS[card.icon] : null;
        return (
          <Card key={i} className="border border-border bg-card">
            <CardContent className="space-y-2.5 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                {Icon && <Icon className={CARD_ACCENT_CLASSES[card.accent ?? "primary"]} />}
                {renderInlineText(card.title, `${key}-${i}-t`)}
              </h3>
              {card.description && (
                <p className="text-xs text-muted-foreground">{card.description}</p>
              )}
              {card.blocks.map((child, j) => renderBlock(child, `${key}-${i}-${j}`))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function renderBlock(block: LegalBlock, key: string): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderInlineText(block.text, key)}
        </p>
      );
    case "subHeading":
      return (
        <h4 key={key} className="pt-2 font-semibold text-foreground">
          {renderInlineText(block.text, key)}
        </h4>
      );
    case "list":
      return renderList(block, key);
    case "note":
      return renderNote(block, key);
    case "callout":
      return renderCallout(block, key);
    case "cards":
      return renderCards(block, key);
  }
}

const FLOW_BLOCK_TYPES = new Set<LegalBlock["type"]>(["paragraph", "subHeading", "list", "note"]);

/** Последовательные «потоковые» блоки группируются в одну карточку; cards/callout рендерятся сами. */
function renderSectionBody(blocks: LegalBlock[]): ReactNode {
  const parts: ReactNode[] = [];
  let flow: LegalBlock[] = [];
  let flowIndex = 0;
  const flushFlow = () => {
    if (flow.length === 0) return;
    parts.push(
      <Card key={`flow-${flowIndex++}`} className="border border-border bg-card">
        <CardContent className="space-y-3 p-5 text-muted-foreground">
          {flow.map((block, i) => renderBlock(block, String(i)))}
        </CardContent>
      </Card>,
    );
    flow = [];
  };
  for (const block of blocks) {
    if (FLOW_BLOCK_TYPES.has(block.type)) {
      flow.push(block);
    } else {
      flushFlow();
      parts.push(renderBlock(block, `block-${parts.length}`));
    }
  }
  flushFlow();
  return parts;
}

interface LegalDocumentProps {
  sections: LegalSection[];
  className?: string;
}

/** Рендерит секции документа (без шапки и реквизитов — их дают LegalDocumentLayout / модалка). */
export default function LegalDocument({ sections, className }: LegalDocumentProps) {
  return (
    <div className={cn("space-y-8 text-sm leading-relaxed sm:text-base", className)}>
      {sections.map((section, index) => {
        const Icon = section.icon ? SECTION_ICONS[section.icon] : null;
        return (
          <section key={index} className="space-y-4">
            {section.title && (
              <h2 className="flex items-center gap-2.5 text-xl font-bold text-foreground">
                {Icon && <Icon className="h-5 w-5 text-primary" />}
                {section.title}
              </h2>
            )}
            {renderSectionBody(section.blocks)}
          </section>
        );
      })}
    </div>
  );
}
