"use client";

import { useState, useEffect } from "react";
import { cn } from "./lib/utils";
import {
  TarpitMetrics,
  HoneypotMetrics,
  UserAgentMetric,
  HoneypotInteraction,  MitreEngageMapping,
  MITRE_ENGAGE_ACTIVITIES,
  MitreEngageActivity,
} from "./types";

interface DeceptionConsoleProps {
  tarpitMetrics: TarpitMetrics;
  honeypotMetrics: HoneypotMetrics;
  mitreMapping: MitreEngageMapping;
  className?: string;
  autoRefresh?: number;
}

export function DeceptionConsole({
  tarpitMetrics,
  honeypotMetrics,
  mitreMapping,
  className,
  autoRefresh = 30000,
}: DeceptionConsoleProps) {
  const [activeTab, setActiveTab] = useState<"tarpit" | "honeypot" | "mitre">("tarpit");

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Trigger refresh via parent component
      window.dispatchEvent(new CustomEvent("deception-refresh"));
    }, autoRefresh);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <section className={cn("deception-console", className)} aria-label="Console de Deception">
      <header className="deception-header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Deception Console</h2>
            <p className="text-muted-foreground">
              Métricas de tarpit, honeypot e mapeamento MITRE Engage
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="deception-status online" aria-label="Tarpit ativo">
              <span className="status-dot" />
              <span>Tarpit Ativo</span>
            </div>
            <div className="deception-status online" aria-label="Honeypot ativo">
              <span className="status-dot" />
              <span>Honeypot Ativo</span>
            </div>
          </div>
        </div>

        <nav className="deception-tabs mt-4" role="tablist" aria-label="Abas do console">
          <button
            role="tab"
            aria-selected={activeTab === "tarpit"}
            aria-controls="tarpit-panel"
            id="tarpit-tab"
            className={cn("deception-tab", activeTab === "tarpit" && "active")}
            onClick={() => setActiveTab("tarpit")}
          >
            Tarpit ({tarpitMetrics.totalCaptures})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "honeypot"}
            aria-controls="honeypot-panel"
            id="honeypot-tab"
            className={cn("deception-tab", activeTab === "honeypot" && "active")}
            onClick={() => setActiveTab("honeypot")}
          >
            Honeypot ({honeypotMetrics.stagesGenerated})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "mitre"}
            aria-controls="mitre-panel"
            id="mitre-tab"
            className={cn("deception-tab", activeTab === "mitre" && "active")}
            onClick={() => setActiveTab("mitre")}
          >
            MITRE Engage
          </button>
        </nav>
      </header>

      <div role="tabpanel" id="tarpit-panel" aria-labelledby="tarpit-tab" hidden={activeTab !== "tarpit"}>
        <TarpitPanel metrics={tarpitMetrics} />
      </div>

      <div role="tabpanel" id="honeypot-panel" aria-labelledby="honeypot-tab" hidden={activeTab !== "honeypot"}>
        <HoneypotPanel metrics={honeypotMetrics} />
      </div>

      <div role="tabpanel" id="mitre-panel" aria-labelledby="mitre-tab" hidden={activeTab !== "mitre"}>
        <MitrePanel mapping={mitreMapping} />
      </div>
    </section>
  );
}

function TarpitPanel({ metrics }: { metrics: TarpitMetrics }) {
  return (
    <div className="deception-panel space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Resumo do tarpit">
        <MetricCard
          label="Capturas Totais"
          value={metrics.totalCaptures.toLocaleString()}
          icon="🎯"
          description="Requisições tarpitted"
        />
        <MetricCard
          label="IPs Únicos"
          value={metrics.uniqueIPs.toLocaleString()}
          icon="🌐"
          description="Adversários distintos"
        />
        <MetricCard
          label="Bytes Servidos"
          value={formatBytes(metrics.totalBytesServed)}
          icon="📦"
          description="Dados falsos entregues"
        />
        <MetricCard
          label="Retenção Média"
          value={`${metrics.averageRetentionSeconds.toFixed(1)}s`}
          icon="⏱️"
          description="Tempo de engajamento"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="top-agents-title" className="card-explicit p-4">
          <h3 id="top-agents-title" className="font-medium mb-4">Top User-Agents Capturados</h3>
          <div className="space-y-3">
            {metrics.  topUserAgents.slice(0, 10).map((ua: UserAgentMetric, i: number) => (
              <div key={ua.userAgent} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <code className="truncate max-w-[300px]">{ua.userAgent}</code>
                </div>
                <div className="text-right">
                  <div className="font-mono">{ua.count} requisições</div>
                  <div className="text-muted-foreground">{formatBytes(ua.totalBytes)} · {ua.averageRetention.toFixed(1)}s médio</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="hourly-title" className="card-explicit p-4">
          <h3 id="hourly-title" className="font-medium mb-4">Capturas por Hora (últimas 24h)</h3>
          <div className="chart-placeholder h-64 flex items-center justify-center text-muted-foreground">
            [Gráfico de barras: capturas por hora]
          </div>
        </section>
      </div>

      {metrics.falsePositives > 0 && (
        <div className="alert alert-warning p-4 border-l-4 border-yellow-500">
          <strong>⚠ Falsos Positivos:</strong> {metrics.falsePositives} requisições legítimas caíram no tarpit.
          Revise as regras de detecção de scanner.
        </div>
      )}
    </div>
  );
}

function HoneypotPanel({ metrics }: { metrics: HoneypotMetrics }) {
  return (
    <div className="deception-panel space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Resumo do honeypot">
        <MetricCard
          label="Uptime"
          value={formatUptime(metrics.uptime)}
          icon="⏰"
          description="Tempo ativo"
        />
        <MetricCard
          label="Stages Gerados"
          value={metrics.stagesGenerated.toLocaleString()}
          icon="🎭"
          description="Cenários falsos criados"
        />
        <MetricCard
          label="Tokens Servidos"
          value={metrics.tokensServed.toLocaleString()}
          icon="🔑"
          description="Credenciais falsas entregues"
        />
        <MetricCard
          label="Interações"
          value={metrics.interactions.length.toLocaleString()}
          icon="🤝"
          description="Total de interações"
        />
      </div>

      <section aria-labelledby="interactions-title" className="card-explicit p-4">
        <h3 id="interactions-title" className="font-medium mb-4">Interações Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Timestamp</th>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">User-Agent</th>
                <th className="text-left p-2">Stage</th>
                <th className="text-left p-2">Path</th>
                <th className="text-left p-2">Duração</th>
              </tr>
            </thead>
            <tbody>
              {metrics.interactions.slice(-20).reverse().map((i: HoneypotInteraction) => (
                <tr key={i.id} className="border-b border-border/50">
                  <td className="p-2 font-mono">{i.timestamp.toLocaleTimeString()}</td>
                  <td className="p-2">{i.sourceIP}</td>
                  <td className="p-2 truncate max-w-[200px]">{i.userAgent}</td>
                  <td className="p-2"><code>{i.stage}</code></td>
                  <td className="p-2"><code>{i.path}</code></td>
                  <td className="p-2 font-mono">{i.duration.toFixed(2)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MitrePanel({ mapping }: { mapping: MitreEngageMapping }) {
  const activities: MitreEngageActivity[] = ["affect", "elicit", "expose", "prepare", "understand"];

  return (
    <div className="deception-panel space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" role="list" aria-label="Mapeamento MITRE Engage">
        {activities.map((activity: MitreEngageActivity) => (
          <MitreActivityCard
            key={activity}
            activity={activity}
            label={MITRE_ENGAGE_ACTIVITIES[activity as MitreEngageActivity]}
            data={mapping[activity as MitreEngageActivity]}
          />
        ))}
      </div>

      <section className="card-explicit p-4" aria-labelledby="mitre-legend-title">
        <h3 id="mitre-legend-title" className="font-medium mb-4">Legenda das Atividades</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {activities.map((activity) => (
            <div key={activity} className="flex items-start gap-3">
              <dt className="font-mono font-medium text-primary">{activity.toUpperCase()}</dt>
              <dd className="text-muted-foreground">{MITRE_ENGAGE_ACTIVITIES[activity as MitreEngageActivity]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function MitreActivityCard({
  activity,
  label,
  data,
}: {
  activity: MitreEngageActivity;
  label: string;
  data: MitreEngageMapping[MitreEngageActivity];
}) {
  return (
    <article className="card-explicit p-4 mitre-card" role="listitem">
      <header className="mb-3">
        <span className="mitre-activity-badge">{activity.toUpperCase()}</span>
        <h4 className="font-medium mt-1">{label}</h4>
      </header>
      <dl className="space-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="font-mono">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function MetricCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: string;
  description: string;
}) {
  return (
    <article className="card-explicit p-4 metric-card" role="listitem">
      <div className="flex items-start gap-3">
        <span className="metric-icon text-2xl" aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-2xl font-bold font-mono truncate">{value}</dd>
          <dd className="text-xs text-muted-foreground">{description}</dd>
        </div>
      </div>
    </article>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}