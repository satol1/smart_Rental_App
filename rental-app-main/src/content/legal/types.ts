// src/content/legal/types.ts
// Единственный источник текстов юридических документов (модалки и страницы рендерят эти данные).

/** Имя иконки из SECTION_ICONS в рендерере LegalDocument. */
export type LegalIconName =
  | "alertCircle"
  | "bellRing"
  | "camera"
  | "checkCircle"
  | "checkCircle2"
  | "clock"
  | "cookie"
  | "cpu"
  | "database"
  | "eye"
  | "fileSignature"
  | "fileText"
  | "helpCircle"
  | "lock"
  | "mail"
  | "mailCheck"
  | "phone"
  | "scale"
  | "settings2"
  | "shield"
  | "shieldAlert"
  | "shieldCheck"
  | "user"
  | "userCheck";

/**
 * Текст с мини-разметкой: **жирный**, *курсив*, [текст](href).
 * Плейсхолдеры вида {legalEntity}, {ogrnip}, {inn}, {address}, {email}, {phones}
 * подставляются рендерером из COMPANY_INFO — реквизиты в контенте не дублируются.
 */
export type LegalRichText = string;

export interface LegalParagraphBlock {
  type: "paragraph";
  text: LegalRichText;
}

export interface LegalListBlock {
  type: "list";
  variant?: "bullet" | "check" | "number";
  items: LegalRichText[];
}

export interface LegalSubHeadingBlock {
  type: "subHeading";
  text: LegalRichText;
}

/** Мелкая сноска/примечание внутри карточки. */
export interface LegalNoteBlock {
  type: "note";
  tone?: "warning" | "muted";
  text: LegalRichText;
}

/** Выделенный блок (преамбула, инструкция, предупреждение). */
export interface LegalCalloutBlock {
  type: "callout";
  tone?: "info" | "warning" | "primary";
  title?: LegalRichText;
  blocks: LegalBlock[];
}

/** Сетка карточек с заголовком и списком (категории данных, типы cookie). */
export interface LegalCardsBlock {
  type: "cards";
  cards: LegalCard[];
}

export interface LegalCard {
  icon?: LegalIconName;
  accent?: "primary" | "emerald" | "sky";
  title: LegalRichText;
  description?: LegalRichText;
  blocks: LegalBlock[];
}

export type LegalBlock =
  | LegalParagraphBlock
  | LegalListBlock
  | LegalSubHeadingBlock
  | LegalNoteBlock
  | LegalCalloutBlock
  | LegalCardsBlock;

export interface LegalSection {
  /** Если задан — секция получает заголовок h2 с иконкой. */
  icon?: LegalIconName;
  title?: string;
  blocks: LegalBlock[];
}

export interface LegalDocumentContent {
  /** URL-путь страницы документа (без слэша): privacy, terms, cookies, consent, marketing-consent. */
  slug: string;
  title: string;
  subtitle?: string;
  badge?: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
}
