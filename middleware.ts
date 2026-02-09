import { auth } from "./auth";

export default auth((req) => {
  // Add any custom middleware logic here if needed
  // For example, you can check if user is authenticated and redirect
  // For now, we're just using the auth middleware as-is
});

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
