import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function KpiLinkCard({
  label,
  value,
  hint,
  to,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint ? (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "danger"
              ? "text-destructive"
              : tone === "warning"
                ? "text-amber-700"
                : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      ) : null}
    </>
  );

  const className = cn(
    "surface-card block p-5 transition-colors",
    to && "hover:border-primary/30 hover:bg-card",
    tone === "warning" && "border-amber-500/30",
    tone === "danger" && "border-destructive/30",
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
