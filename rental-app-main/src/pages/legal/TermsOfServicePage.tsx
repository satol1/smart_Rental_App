// src/pages/legal/TermsOfServicePage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { TERMS_OF_SERVICE } from "@/content/legal";

export default function TermsOfServicePage() {
  return <LegalDocumentLayout content={TERMS_OF_SERVICE} />;
}
