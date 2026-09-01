import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send } from "lucide-react";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDialog({ open, onOpenChange }: ContactDialogProps) {
  const telegramBot = "d30manager";
  const message = encodeURIComponent(
    "Здравствуйте, у меня вопрос по аренде."
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
        <div className="py-4">
          <ul className="space-y-3 text-sm text-gray-800">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>Email: </span>
              <a href="mailto:info@digital30.ru" className="font-medium text-sky-600 hover:underline">
                info@digital30.ru
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>Телефон:</span>
              <span className="font-semibold">+7 (908) 617-71-77</span>
            </li>
            <li className="flex items-center gap-3">
              <Send className="h-4 w-4 text-gray-500" />
              <span>Telegram:</span>
              <a href={`https://t.me/${telegramBot}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline">
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

