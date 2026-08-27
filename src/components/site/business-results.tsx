import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { CompanySignals } from "@/components/site/company-signals";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/demo";
import type { BusinessHit } from "@/lib/platform/business-search";

/**
 * Компании и услуги в общем поиске. Туровая выдача остаётся своей —
 * это отдельный блок, чтобы зал или прокат находились по тому же запросу.
 */
export function BusinessResults({ hits }: { hits: BusinessHit[] }) {
  if (hits.length === 0) return null;

  return (
    <section className="surface-card mt-5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Building2 className="size-4 text-primary" />
            Компании и услуги
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Спорт, жильё и авто по вашему запросу. Запись — напрямую в компании.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
          {hits.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {hits.slice(0, 6).map(({ company, listings, fromPrice }) => (
          <article
            key={company.id}
            className="rounded-2xl border border-border p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to="/company/$companyId"
                  params={{ companyId: company.id }}
                  className="font-display text-base font-semibold hover:text-primary"
                >
                  {company.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{company.city}</p>
                <CompanySignals company={company} />
              </div>
              {fromPrice > 0 ? (
                <p className="shrink-0 text-sm text-muted-foreground">
                  от <span className="font-semibold text-foreground">{formatPrice(fromPrice)}</span>
                </p>
              ) : null}
            </div>

            {listings.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {listings.slice(0, 3).map((listing) => (
                  <li key={listing.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-foreground/80">{listing.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {listing.price > 0 ? formatPrice(listing.price) : "по запросу"}
                    </span>
                  </li>
                ))}
                {listings.length > 3 ? (
                  <li className="text-xs text-muted-foreground">и ещё {listings.length - 3}</li>
                ) : null}
              </ul>
            ) : null}

            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link to="/company/$companyId" params={{ companyId: company.id }}>
                Открыть и записаться
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
