import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePlatformStore } from "@/lib/platform/hooks";
import { cn } from "@/lib/utils";

/**
 * Выбор компании, за которой будет числиться тур.
 *
 * Витрина туров и цены на главной пусты, пока не пришли турфирмы, — тот же
 * замкнутый круг, что и с компаниями. Разрывает его админ: заводит тур
 * реальной компании из ссылки. Тур всегда принадлежит компании, а не
 * платформе: у карточки должен быть продавец, которому турист платит.
 */
export function AddTourForCompanyDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (organizationId: string) => void;
}) {
  const state = usePlatformStore();
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const companies = state.organizations
    .filter((o) => o.status === "APPROVED")
    .filter((o) => !needle || `${o.name} ${o.city}`.toLowerCase().includes(needle))
    .slice(0, 40);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Чей это тур</DialogTitle>
          <DialogDescription>
            Турист платит компании напрямую, поэтому у тура всегда есть продавец. Выберите его —
            дальше откроется карточка тура.
          </DialogDescription>
        </DialogHeader>

        <Input placeholder="Название или город" value={q} onChange={(e) => setQ(e.target.value)} />

        {companies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {state.organizations.some((o) => o.status === "APPROVED")
              ? "Ничего не нашли"
              : "Сначала добавьте компанию — кнопка «Добавить компанию» рядом."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {companies.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(org.id);
                    setQ("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-1 py-3 text-left",
                    "transition-colors hover:bg-secondary/60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{org.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {org.city}
                      {org.listedByPlatform ? " · карточку собрал TourGo" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
