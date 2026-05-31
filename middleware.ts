import { NextRequest, NextResponse } from "next/server";

type UserRole = "admin" | "cashier";

function getUserRole(request: NextRequest): UserRole | null {
  const storedRole = request.cookies.get("userRole")?.value;

  if (storedRole === "admin" || storedRole === "cashier") {
    return storedRole;
  }

  return null;
}

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/pengeluaran" ||
    pathname === "/recap" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function isAdminOnlyPath(pathname: string) {
  return pathname === "/recap" || pathname === "/admin" || pathname.startsWith("/admin/");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = getUserRole(request);

  if (pathname === "/login") {
    if (userRole) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!userRole && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (userRole !== "admin" && isAdminOnlyPath(pathname)) {
    const destination = userRole === "cashier" ? "/" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/pengeluaran", "/recap", "/admin/:path*"],
};