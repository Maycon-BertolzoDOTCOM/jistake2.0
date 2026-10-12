import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hora
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Trama API Key",
      credentials: {
        key: { label: "sk-trama-*", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.key) return null

        // Validar chave no ClientKeyStore do gateway (via API ou DB direto)
        // Aqui simulamos - em produção validar contra ClientKeyStore
        const key = credentials.key.trim()
        if (!key.startsWith("sk-trama-")) return null

        // Hash da chave para comparação
        const keyHash = crypto.createHash("sha256").update(key).digest("hex")

        // Buscar no banco (simulado - em produção validar no ClientKeyStore)
        // const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })
        // if (!apiKey || !apiKey.isActive) return null

        // Retornar user object
        return {
          id: "user-1",
          name: "Trama User",
          email: "user@trama.local",
          image: null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.accessToken = account?.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}