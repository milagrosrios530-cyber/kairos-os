import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv, hasSupabasePublicEnv } from "@/lib/env";
import { fetchWithSupabaseTimeout } from "@/lib/supabase/fetch-with-timeout";

function copySessionHeaders(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  source.headers.forEach((value, key) => target.headers.set(key, value));
  return target;
}

export async function updateSession(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: fetchWithSupabaseTimeout },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (path.startsWith("/app") && !authenticated) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("next", path);
    return copySessionHeaders(response, NextResponse.redirect(target));
  }

  if (path === "/login" && authenticated) {
    const target = request.nextUrl.clone();
    target.pathname = "/app";
    target.search = "";
    return copySessionHeaders(response, NextResponse.redirect(target));
  }

  return response;
}
