import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send } from "lucide-react";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Предзаполненный текст обращения (например, с номером резерва и сутью вопроса) */
  contextMessage?: string;
}

export function ContactDialog({ open, onOpenChange, contextMessage }: ContactDialogProps) {
  const telegramBot = "d30manager";
  const message = encodeURIComponent(
    contextMessage || "Здравствуйте, у меня вопрос по аренде."
  );
  const telegramLink = `https://t.me/${telegramBot}?start=${message}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Связь с менеджером</DialogTitle>
          <DialogDescription>
            Вы можете связаться с нами любым удобным способом.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <ul className="divide-y divide-border text-sm text-foreground">
            <li className="flex min-h-14 flex-wrap items-center gap-3 py-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>Email: </span>
              <a href="mailto:info@digital30.ru" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
                info@digital30.ru
              </a>
            </li>
            <li className="flex min-h-14 flex-wrap items-center gap-3 py-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>Телефон:</span>
              <a href="tel:+79086177177" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">+7 (908) 617-71-77</a>
            </li>
            <li className="flex min-h-14 flex-wrap items-center gap-3 py-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span>Telegram:</span>
              <a href={`https://t.me/${telegramBot}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
                @{telegramBot}
              </a>
            </li>
          </ul>
        </div>
        <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button 
            type="button" 
            onClick={() => window.open(telegramLink, "_blank")}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            Написать в Telegram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

