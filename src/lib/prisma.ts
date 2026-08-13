import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaInstance: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  if (prismaInstance) return prismaInstance;
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
    return prismaInstance;
  }

  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
