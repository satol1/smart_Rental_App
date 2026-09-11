// src/components/shared/ConsentModal.tsx
import LegalDocumentModal from "./LegalDocumentModal";
import { PERSONAL_DATA_CONSENT } from "@/content/legal";

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Показывает то же Согласие на обработку ПД, что и страница /consent (единый источник — src/content/legal). */
export default function ConsentModal({ open, onOpenChange }: ConsentModalProps) {
  return <LegalDocumentModal open={open} onOpenChange={onOpenChange} content={PERSONAL_DATA_CONSENT} />;
}
