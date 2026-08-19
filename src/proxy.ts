import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { puedeVerFinanzas } from "@/lib/acceso-finanzas";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const publicAuthPaths = ["/login", "/activar"];
  const isPublicAuthPage = publicAuthPaths.some(
    (path) => req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  );

  if (!isLoggedIn && !isPublicAuthPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && req.nextUrl.pathname.startsWith("/login")) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // Rutas solo para Admin
  const adminOnlyPaths = ["/admin", "/usuarios", "/proveedores", "/utileros"];
  const isAdminCreatePath = req.nextUrl.pathname === "/eventos/nuevo" || /^\/eventos\/[^/]+\/editar$/.test(req.nextUrl.pathname);
  const isAdminPath = adminOnlyPaths.some((p) => req.nextUrl.pathname.startsWith(p)) || isAdminCreatePath;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  if (isAdminPath && !isAdmin && isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  const isFinancePath = ["/finanzas", "/reportes"].some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );
  if (isFinancePath && isLoggedIn && !puedeVerFinanzas(req.auth?.user)) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
