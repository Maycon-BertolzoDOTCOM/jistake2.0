"use client";

import { cn } from "./lib/utils";
import { StatusLevel, StatusCheck } from "@hub/status-engine";

const LEVEL_CONFIG: Record<StatusLevel, { label: string; color: string; bg: string; border: string }> = {
  ok: { label: "OK", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  warning: { label: "ATENÇÃO", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  critical: { label: "CRÍTICO", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  unknown: { label: "DESCONHECIDO", color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

interface StatusCardProps {
  check: StatusCheck;
  showDetails?: boolean;
  onAction?: (action: string) => void;
  actions?: Array<{ label: string; action: string; variant?: "primary" | "secondary" | "ghost" }>;
  className?: string;
}

export function StatusCard({
  check,
  showDetails = true,
  onAction,
  actions = [],
  className,
}: StatusCardProps) {
  const config = LEVEL_CONFIG[check.level];

  return (
    <article
      className={cn(
        "status-card",
        config.bg,
        config.border,
        "border rounded-lg p-4 transition-colors",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <header className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-lg" id={`status-${check.entityId}-title`}>
            {String(check.metadata?.label || check.entityId)}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5" id={`status-${check.entityId}-msg`}>
            {check.message}
          </p>
        </div>
        <span
          className={cn(
            "status-badge px-2 py-0.5 text-xs font-medium rounded-full",
            config.color,
            config.bg.replace("bg-", "bg-"),
            config.border.replace("border-", "border-")
          )}
          aria-label={`Status: ${config.label}`}
        >
          {config.label}
        </span>
      </header>

      {showDetails && check.expiresAt && (
        <div className="status-details mb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expira em</span>
            <span className="font-mono">{formatDaysLeft(check.expiresAt)}</span>
          </div>
          {Boolean(check.metadata?.issuer) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emissor</span>
              <span>{String(check.metadata?.issuer)}</span>
            </div>
          )}
          {Boolean(check.metadata?.subject) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assunto</span>
              <span className="truncate max-w-[200px]">{String(check.metadata?.subject)}</span>
            </div>
          )}
        </div>
      )}

      {actions.length > 0 && onAction && (
        <div className="status-actions flex gap-2 pt-2 border-t border-current/10">
          {actions.map((action) => (
            <button
              key={action.action}
              type="button"
              onClick={() => onAction(action.action)}
              className={cn(
                "btn btn--sm flex-1",
                `btn--${action.variant || "secondary"}`
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDaysLeft(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)} dias atrás (expirado)`;
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

interface StatusGridProps {
  checks: StatusCheck[];
  providerName: string;
  onAction?: (entityId: string, action: string) => void;
  className?: string;
}

export function StatusGrid({ checks, providerName, onAction, className }: StatusGridProps) {
  const ok = checks.filter((c) => c.level === "ok").length;
  const warning = checks.filter((c) => c.level === "warning").length;
  const critical = checks.filter((c) => c.level === "critical").length;
  const unknown = checks.filter((c) => c.level === "unknown").length;

  return (
    <section className={cn("status-grid", className)} aria-labelledby={`status-${providerName}-title`}>
      <header className="mb-4">
        <h2 id={`status-${providerName}-title`} className="text-xl font-bold">
          {providerName}
        </h2>
        <div className="status-summary flex gap-4 mt-2 text-sm">
          <span className="text-green-400">✓ {ok} OK</span>
          <span className="text-yellow-400">⚠ {warning} Aviso</span>
          <span className="text-red-400">✗ {critical} Crítico</span>
          <span className="text-muted-foreground">? {unknown} Desconhecido</span>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
        {checks.map((check) => (
          <StatusCard
            key={check.entityId}
            check={check}
            actions={[
              { label: "Ver Detalhes", action: `view:${check.entityId}`, variant: "ghost" },
              { label: "Renovar", action: `renew:${check.entityId}`, variant: "secondary" },
            ]}
            onAction={(action) => onAction?.(check.entityId, action)}
          />
        ))}
      </div>
      {checks.length === 0 && (
        <div className="empty-state text-center py-8 text-muted-foreground">
          Nenhuma entidade monitorada
        </div>
      )}
    </section>
  );
}