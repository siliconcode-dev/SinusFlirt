import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const REDIRECT_COOKIE = "post_auth_redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  // Set by GoogleSignInButton before starting the OAuth redirect — see that
  // file for why this is a cookie rather than a redirectTo query string.
  const rawNext = cookieStore.get(REDIRECT_COOKIE)?.value;
  // Only ever a same-origin path we set ourselves, but guard against a
  // tampered/malformed cookie value forcing an off-site redirect anyway.
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? decodeURIComponent(rawNext)
    : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete(REDIRECT_COOKIE);
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/age-gate`);
  response.cookies.delete(REDIRECT_COOKIE);
  return response;
}
