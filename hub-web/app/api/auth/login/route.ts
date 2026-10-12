import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const key = body?.key?.trim()

    if (!key || !key.startsWith("sk-trama-")) {
      return NextResponse.json({ error: "chave_invalida" }, { status: 401 })
    }

    // Em produção: validar contra ClientKeyStore do gateway
    // const keyHash = crypto.createHash("sha256").update(key).digest("hex")
    // const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })

    // Simulação para desenvolvimento
    const tenant = "trama-user"

    const response = NextResponse.json({ logado: true, tenant })
    response.cookies.set("trama_hub", `session-${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    })
    return response
  } catch {
    return NextResponse.json({ error: "erro_interno" }, { status: 500 })
  }
}