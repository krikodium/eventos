import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const publicAuthPaths = ["/login", "/registro", "/confirmar", "/recuperar", "/restablecer"];
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
  const adminOnlyPaths = ["/admin", "/usuarios", "/reportes", "/proveedores", "/utileros"];
  const isAdminCreatePath = req.nextUrl.pathname === "/eventos/nuevo" || /^\/eventos\/[^/]+\/editar$/.test(req.nextUrl.pathname);
  const isAdminPath = adminOnlyPaths.some((p) => req.nextUrl.pathname.startsWith(p)) || isAdminCreatePath;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  if (isAdminPath && !isAdmin && isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
