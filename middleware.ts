import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types";

const protectedRoutes = ["/dashboard", "/asset", "/portfolio", "/watchlist", "/historique", "/settings"];
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req: request, res: response });
  const { data: { session } } = await supabase.auth.getSession();
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (session && (isProtected || pathname === "/login/mfa")) {
    // Accounts with a verified TOTP factor must complete the second step
    // before reaching any private page.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    if (needsMfa && pathname !== "/login/mfa") {
      const url = new URL("/login/mfa", request.url);
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (!needsMfa && pathname === "/login/mfa") return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/asset/:path*", "/portfolio/:path*", "/watchlist/:path*", "/historique/:path*", "/settings/:path*", "/login", "/login/mfa", "/register"],
};
