import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { addCompanyReview } from "@/lib/platform/messages";
import { cn } from "@/lib/utils";

/**
 * Отзыв клиента о компании после визита.
 *
 * requestId сознательно не передаём: в базе это ссылка на туровую заявку,
 * а запись в зал живёт в другой таблице.
 */
export function CompanyReviewDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  userId,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim().length < 10) {
      toast.error("Напишите хотя бы пару слов о компании");
      return;
    }
    addCompanyReview({ organizationId, userId, authorName: userName, rating, text });
    onOpenChange(false);
    setText("");
    toast.success("Спасибо! Отзыв опубликован");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отзыв о «{organizationName}»</DialogTitle>
          <DialogDescription>
            Ваш отзыв увидят другие клиенты на странице компании.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Оценка ${value}`}
                onClick={() => setRating(value)}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "size-7",
                    value <= rating ? "fill-premium text-premium" : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Как всё прошло? Что понравилось, что можно улучшить?"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit}>Опубликовать отзыв</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
