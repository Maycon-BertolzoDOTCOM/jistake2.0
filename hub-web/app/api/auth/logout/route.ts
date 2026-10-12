import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ logado: false })
  response.cookies.delete("trama_hub", { path: "/" })
  return response
}