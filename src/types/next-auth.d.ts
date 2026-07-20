import "next-auth";
import type { EventosPermisos } from "@/lib/permisos";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    permisos?: EventosPermisos;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      permisos: EventosPermisos;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    permisos?: EventosPermisos;
  }
}
