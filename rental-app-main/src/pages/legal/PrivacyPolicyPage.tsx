// src/pages/legal/PrivacyPolicyPage.tsx
import LegalDocumentLayout from "./LegalDocumentLayout";
import { PRIVACY_POLICY } from "@/content/legal";

export default function PrivacyPolicyPage() {
  return <LegalDocumentLayout content={PRIVACY_POLICY} />;
}
