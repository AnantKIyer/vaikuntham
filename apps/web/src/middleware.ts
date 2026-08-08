import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
]);

const bypass =
  process.env.AUTH_DEV_BYPASS === "true" &&
  process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true" &&
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
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
