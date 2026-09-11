// src/pages/legal/CookiePolicyPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { COOKIE_POLICY } from "@/content/legal";

export default function CookiePolicyPage() {
  return <LegalDocumentLayout content={COOKIE_POLICY} />;
}
