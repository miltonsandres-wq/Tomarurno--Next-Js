import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabaseResponse, user, supabase, authUnavailable: false };
  } catch {
    // Transient network failure talking to Supabase Auth (DNS blip, timeout,
    // etc). Don't let it crash the whole request pipeline — treat this
    // request as "can't verify right now" instead of "logged out", so a
    // flaky connection never force-logs-out an agent mid-shift. The
    // destination page's own server-side auth check still runs normally.
    return { supabaseResponse, user: null, supabase, authUnavailable: true };
  }
}
