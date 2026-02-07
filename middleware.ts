export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page
     * - student routes (students access via direct links)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|en/login|en/student).*)",
  ],
};
