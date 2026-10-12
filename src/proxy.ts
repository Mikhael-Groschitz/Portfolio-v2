import { type NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  routeRequest,
} from "@/components/locale/locale-routing";

export function proxy(request: NextRequest) {
  const route = routeRequest({
    pathname: request.nextUrl.pathname,
    choice: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
    userAgent: request.headers.get("user-agent"),
  });
  if (route.kind === "next") {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = route.pathname;
  return route.kind === "redirect"
    ? NextResponse.redirect(url)
    : NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|__nextjs|_vercel|v1|.*\\.).*)"],
};
