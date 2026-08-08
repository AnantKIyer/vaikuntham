import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
]);

const bypass =
  process.env.AUTH_DEV_BYPASS === "true" &&
  process.env.NODE_ENV !== "production";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
const secretKey = process.env.CLERK_SECRET_KEY?.trim();
const clerkConfigured = Boolean(
  publishableKey &&
    secretKey &&
    (publishableKey.startsWith("pk_test_") ||
      publishableKey.startsWith("pk_live_")),
);

export default clerkConfigured && !bypass
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware(req: NextRequest) {
      if (bypass || isPublicRoute(req)) {
        return NextResponse.next();
      }
      // Without Clerk keys, allow app routes so foundation UI can be reviewed
      if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/app")) {
        return NextResponse.next();
      }
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
