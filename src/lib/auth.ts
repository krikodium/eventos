import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { resolvePermisos, type EventosPermisos } from "./permisos";

/** Lee JSON de permisos sin usar el campo en `select` del client (evita mismatch schema/client y funciona en login Node). */
async function fetchEventosPermisosRaw(userId: string): Promise<Prisma.JsonValue | null> {
  try {
    const rows = await prisma.$queryRaw<{ eventosPermisos: Prisma.JsonValue | null }[]>(
      Prisma.sql`SELECT "eventosPermisos" FROM "User" WHERE "id" = ${userId} LIMIT 1`
    );
    return rows[0]?.eventosPermisos ?? null;
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user?.password) return null;

        const isValid = await compare(password, user.password);
        if (!isValid) return null;

        const role = String(user.role);
        const stored = await fetchEventosPermisosRaw(user.id);
        const permisos = resolvePermisos(role, stored);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role,
          permisos,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        const u = user as { permisos?: EventosPermisos };
        if (u.permisos) {
          token.permisos = u.permisos;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? token.email ?? "";
        session.user.role = String(token.role ?? "VENDEDOR");
        const fromToken = token.permisos as EventosPermisos | undefined;
        session.user.permisos = fromToken ?? resolvePermisos(session.user.role, null);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
});
