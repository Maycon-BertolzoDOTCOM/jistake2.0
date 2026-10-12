"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"

const CARDS = [
  { id: "gateway", nome: "Gateway / SmartRouter", links: [["/dashboard", "Dashboard"], ["/docs", "Docs"]] },
  { id: "keypool", nome: "KeyPool :9302", links: [["http://127.0.0.1:9302", "KeyPool"]] },
  { id: "microrouter", nome: "MicroRouter :20128", links: [] },
  { id: "sigil", nome: "Sigil :8080", links: [["/v1/sigil/portal", "Portal Verificação"]] },
  { id: "janus", nome: "Janus (Auditor de GPTs)", links: [["/janus", "Relatórios"]] },
  { id: "escapekit", nome: "EscapeKit MCP", links: [["/escapekit", "Builds"]] },
]

export default function Home() {
  const { data: session, status } = useSession()
  const [statusData, setStatusData] = useState<any>(null)
  const [achados, setAchados] = useState<any[]>([])
  const [key, setKey] = useState("")

  useEffect(() => {
    if (status === "authenticated") {
      fetchStatus()
      fetchAchados()
    }
  }, [status])

  const fetchStatus = async () => {
    try {
      const res = await fetch("/v1/hub/status")
      if (res.ok) setStatusData(await res.json())
    } catch {}
  }

  const fetchAchados = async () => {
    try {
      const res = await fetch("/v1/hub/achados")
      if (res.ok) {
        const data = await res.json()
        setAchados(data.achados || [])
      }
    } catch {}
  }

  const login = async () => {
    const res = await fetch("/v1/hub/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
    if (res.ok) {
      window.location.reload()
    } else {
      alert("Chave inválida")
    }
  }

  const logout = async () => {
    await fetch("/v1/hub/logout", { method: "POST" })
    window.location.reload()
  }

  if (status === "loading") return <div className="flex h-screen items-center justify-center">Carregando…</div>

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">HUB — Trama</h1>
        {status === "authenticated" ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Logado como <b>{session?.user?.name || session?.user?.email}</b></span>
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">Sair</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="sk-trama-*"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="px-3 py-1.5 bg-input border border-border rounded-md text-sm w-64"
              placeholder="sk-trama-*"
            />
            <button onClick={login} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">
              Entrar
            </button>
          </div>
        )}
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {CARDS.map((c) => {
            const svc = statusData?.servicos?.[c.id]
            const status = c.id === "janus" || c.id === "escapekit" ? "manual" : svc?.status || "off"
            return (
              <div key={c.id} className="card p-4">
                <h3 className="font-medium flex items-center gap-2">
                  <span className={`dot ${status}`}></span>
                  {c.nome}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {c.id === "janus" || c.id === "escapekit" ? "CLI — ver seção dedicada" : status}
                </p>
                <div className="mt-3 flex gap-2">
                  {c.links.map(([href, label]) => (
                    <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} className="text-sm text-primary hover:underline">
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Achados Críticos */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="dot off"></span>
            Pontos Críticos
          </h2>
          {achados.length === 0 ? (
            <p className="text-muted-foreground">Nenhum achado grave/crítico publicado. Relatórios Janus aparecem aqui automaticamente após cada fila.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achados.slice(0, 12).map((a, i) => (
                <div key={i} className="p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`dot ${a.nivel === "critico" ? "destructive" : "warning"}`}></span>
                    <span className="font-medium">{a.gpt}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${a.nivel === "critico" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                      {a.nivel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.categoria} · {a.canal} · {a.idioma}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.prompt_id} · {a.data}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Links rápidos */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/janus" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
              Ver Relatórios Janus
            </Link>
            <Link href="/escapekit" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
              EscapeKit Builds
            </Link>
            <a href="/v1/hub/achados" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
              API Achados
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}