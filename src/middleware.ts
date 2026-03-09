import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
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

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
