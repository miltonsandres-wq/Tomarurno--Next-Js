import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase, authUnavailable } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isDashboardRoute = path.startsWith("/ventanilla") || path.startsWith("/supervisor");
  const isLoginRoute = path === "/login";

  // Can't verify the session right now (Supabase Auth unreachable): don't
  // force a redirect either way, let the destination page's own
  // server-side check decide instead of kicking out a real session.
  if (authUnavailable) {
    return supabaseResponse;
  }

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    try {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      const url = request.nextUrl.clone();
      url.pathname = perfil?.rol === "agente" ? "/ventanilla" : "/supervisor";
      return NextResponse.redirect(url);
    } catch {
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|kiosco|display|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
