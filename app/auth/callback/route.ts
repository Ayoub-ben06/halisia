import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { safeNextPath } from "@/lib/safe-redirect";
import type { Database } from "@/types";

export const dynamic = "force-dynamic";

/** Target of email links (signup confirmation, password reset) and OAuth sign-in. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "lien-invalide");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.redirect(new URL(next, request.url));
}
