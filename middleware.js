/**
 * HTTP Basic Auth middleware — protege todas las rutas del dashboard.
 * Configurable via variables de entorno:
 *   BASIC_AUTH_USER  (default: "danke")
 *   BASIC_AUTH_PASS  (default: "danke2026")
 *
 * Compatibilidad: Next.js 14 Edge Runtime (sin Node.js APIs).
 */

import { NextResponse } from "next/server";

const REALM = "Dashboard Logística";

export function middleware(req) {
  const user = process.env.BASIC_AUTH_USER ?? "danke";
  const pass = process.env.BASIC_AUTH_PASS ?? "danke2026";
  const expected = "Basic " + btoa(`${user}:${pass}`);

  const auth = req.headers.get("authorization") ?? "";

  if (auth === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Acceso no autorizado", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // Protege todo excepto assets estáticos de Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
