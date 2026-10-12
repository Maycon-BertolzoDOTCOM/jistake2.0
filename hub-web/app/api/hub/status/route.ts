import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import httpx from "httpx"

const SERVICOS = {
  gateway: { url: process.env.GATEWAY_URL || "http://127.0.0.1:8000/overview", nome: "Gateway / SmartRouter" },
  keypool: { url: (process.env.KEYPOOL_URL || "http://127.0.0.1:9302") + "/health", nome: "KeyPool" },
  microrouter: { url: (process.env.MICROROUTER_URL || "http://127.0.0.1:20128") + "/v1/microrouter/health", nome: "MicroRouter" },
  sigil: { url: (process.env.SIGIL_URL || "http://127.0.0.1:8080") + "/health", nome: "Sigil" },
}

const TIMEOUT = parseFloat(process.env.HUB_CHECK_TIMEOUT || "2.0")

async function check(key: string, url: string) {
  try {
    const t0 = Date.now()
    const res = await httpx.get(url, { timeout: TIMEOUT })
    const ok = res.status >= 200 && res.status < 300
    return { servico: key, status: ok ? "live" : "degradado", http: res.status, latencia_ms: Date.now() - t0 }
  } catch (e: any) {
    return { servico: key, status: "off", erro: e.constructor.name }
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 })
  }

  const checks = await Promise.all(Object.entries(SERVICOS).map(([k, v]) => check(k, v.url)))
  const geral = checks.every(c => c.status === "live") ? "live" : checks.every(c => c.status === "off") ? "off" : "degradado"

  return NextResponse.json({ geral, servicos: Object.fromEntries(checks.map(c => [c.servico, c])) })
}