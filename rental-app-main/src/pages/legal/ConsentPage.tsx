// src/pages/legal/ConsentPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { PERSONAL_DATA_CONSENT } from "@/content/legal";

export default function ConsentPage() {
  return <LegalDocumentLayout content={PERSONAL_DATA_CONSENT} />;
}
