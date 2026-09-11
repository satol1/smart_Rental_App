// src/content/legal/index.ts
// Единый источник текстов юридических документов: используют и страницы (/privacy, /terms, ...),
// и модалки (PrivacyPolicyModal и т.д.). Реквизиты ИП подставляются из COMPANY_INFO при рендере.
export type {
  LegalBlock,
  LegalCalloutBlock,
  LegalCard,
  LegalCardsBlock,
  LegalDocumentContent,
  LegalIconName,
  LegalListBlock,
  LegalNoteBlock,
  LegalParagraphBlock,
  LegalRichText,
  LegalSection,
  LegalSubHeadingBlock,
} from "./types";

export { PRIVACY_POLICY } from "./privacy";
export { TERMS_OF_SERVICE } from "./terms";
export { COOKIE_POLICY } from "./cookiePolicy";
export { PERSONAL_DATA_CONSENT } from "./consent";
export { MARKETING_CONSENT } from "./marketingConsent";
