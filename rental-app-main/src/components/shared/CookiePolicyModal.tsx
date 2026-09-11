// src/components/shared/CookiePolicyModal.tsx
import LegalDocumentModal from "./LegalDocumentModal";
import { COOKIE_POLICY } from "@/content/legal";

interface CookiePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Показывает ту же Политику cookie, что и страница /cookies (единый источник — src/content/legal). */
export default function CookiePolicyModal({ open, onOpenChange }: CookiePolicyModalProps) {
  return <LegalDocumentModal open={open} onOpenChange={onOpenChange} content={COOKIE_POLICY} />;
}
