// src/components/shared/TermsOfServiceModal.tsx
import LegalDocumentModal from "./LegalDocumentModal";
import { TERMS_OF_SERVICE } from "@/content/legal";

interface TermsOfServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Показывает то же Пользовательское соглашение, что и страница /terms (единый источник — src/content/legal). */
export default function TermsOfServiceModal({ open, onOpenChange }: TermsOfServiceModalProps) {
  return <LegalDocumentModal open={open} onOpenChange={onOpenChange} content={TERMS_OF_SERVICE} />;
}
