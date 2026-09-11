// src/components/shared/PrivacyPolicyModal.tsx
import LegalDocumentModal from "./LegalDocumentModal";
import { PRIVACY_POLICY } from "@/content/legal";

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Показывает ту же Политику ПД, что и страница /privacy (единый источник — src/content/legal). */
export default function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  return <LegalDocumentModal open={open} onOpenChange={onOpenChange} content={PRIVACY_POLICY} />;
}
