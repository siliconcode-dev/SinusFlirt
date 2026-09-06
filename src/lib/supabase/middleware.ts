import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/age-gate", "/blocked", "/legal/terms", "/legal/privacy"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isAsset =
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/auth") ||
    /\.[a-zA-Z0-9]+$/.test(path);

  if (isAsset) {
    return supabaseResponse;
  }

  // Every visitor — gated or not — gets a real Supabase auth user via
  // anonymous sign-in, so relationship_state/sessions/deletion can all key
  // off auth.uid() uniformly for the account's entire lifetime.
  let currentUser = user;
  if (!currentUser) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Anonymous sign-in failed:", error.message);
      // Fail closed: with no verified session we can't confirm the
      // age-gate claim, so never let the request through to app routes.
      if (isPublicPath) return supabaseResponse;
      const url = request.nextUrl.clone();
      url.pathname = "/age-gate";
      return NextResponse.redirect(url);
    }
    currentUser = data.user;
  }

  const ageVerifiedAt = currentUser?.app_metadata?.age_verified_at as
    | string
    | undefined;
  const isUnderage = currentUser?.app_metadata?.underage === true;

  if (isUnderage && path !== "/blocked") {
    const url = request.nextUrl.clone();
    url.pathname = "/blocked";
    return NextResponse.redirect(url);
  }

  if (!isUnderage && !ageVerifiedAt && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/age-gate";
    return NextResponse.redirect(url);
  }

  if (!isUnderage && ageVerifiedAt && path === "/age-gate") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
