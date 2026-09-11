// src/components/shared/LegalDocumentModal.tsx
// Универсальная модалка юридического документа поверх единого контента src/content/legal.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { LegalDocumentContent } from "@/content/legal";
import LegalDocument from "./LegalDocument";

interface LegalDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: LegalDocumentContent;
}

export default function LegalDocumentModal({ open, onOpenChange, content }: LegalDocumentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold sm:text-2xl">
            {content.title}
          </DialogTitle>
          <div className="pt-1 text-center">
            <a
              href={`/${content.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Открыть на отдельной странице (/{content.slug})
            </a>
          </div>
        </DialogHeader>

        <LegalDocument sections={content.sections} />
      </DialogContent>
    </Dialog>
  );
}
