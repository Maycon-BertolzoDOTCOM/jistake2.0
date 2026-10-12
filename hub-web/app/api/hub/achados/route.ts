import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const JANUS_REPORTS_DIR = process.env.JANUS_REPORTS_DIR || ""

async function lerAchados(base?: string, limite = 50) {
  const out: any[] = []
  try {
    const root = path.resolve(base || JANUS_REPORTS_DIR)
    if (!root || !(await fs.stat(root).catch(() => false)?.isDirectory())) return out

    const dirs = (await fs.readdir(root)).sort().reverse()
    for (const dir of dirs) {
      const cjPath = path.join(root, dir, "consolidado.json")
      try {
        const content = await fs.readFile(cjPath, "utf-8")
        const doc = JSON.parse(content)
        for (const a of doc.achados || []) {
          if (a.nivel === "critico" || a.nivel === "grave") {
            out.push({ data: dir, ...a })
            if (out.length >= limite) return out
          }
        }
      } catch {}
    }
  } catch {}
  return out
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "login_required" }, { status: 401 })
  }

  const achados = await lerAchados()
  return NextResponse.json({ achados })
}