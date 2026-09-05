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
  const isAppAdmin = Boolean(session.isAppAdmin);

  // Quản lý/Chủ sở hữu không phải chủ app thật sự (Cô Vân, Thầy Thành) vẫn thấy trang chủ như mọi
  // người (để biết app có đủ những gì) nhưng bấm vào bất kỳ mục nào khác ngoài Báo cáo đều bị đưa
  // về lại Báo cáo — chỉ xem được, không tự tay sửa số liệu ở đâu khác.
  if (isManager && !isAppAdmin && pathname !== "/" && !pathname.startsWith("/bao-cao")) {
    return NextResponse.redirect(new URL("/bao-cao", request.url));
  }

  if (pathname.startsWith("/bao-cao") && !isManager) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/quan-tri") && !isAppAdmin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/so-thu-chi") && !isAppAdmin && !session.canManageCashbook) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/health).*)"],
};
