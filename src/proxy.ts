import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const isLoggedIn = Boolean(session.userId);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn) {
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isManager = session.role === "QUAN_LY" || session.role === "CHU_SO_HUU";

  if ((pathname.startsWith("/bao-cao") || pathname.startsWith("/quan-tri")) && !isManager) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/so-thu-chi") && !isManager && !session.canManageCashbook) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/health).*)"],
};
