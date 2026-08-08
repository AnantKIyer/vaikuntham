import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ApiResult } from "@vaikuntham/shared";
import { getApiUrl } from "./config";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

/** One Clerk token lookup per RSC request (dedupes parallel apiFetch calls). */
const getApiAuthHeaders = cache(async (): Promise<HeadersInit> => {
  const headers: Record<string, string> = {};
  if (!isAuthDevBypass()) {
    const session = await auth();
    const token = await session.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
});

/** Dedupes identical GETs within one RSC render (e.g. layout + page). */
export const apiFetch = cache(async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const headers = new Headers(await getApiAuthHeaders());
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (body && "ok" in body && body.ok === false) {
      return body;
    }
    return {
      ok: false,
      error: body && "error" in body ? String(body.error) : res.statusText,
      code: body && "code" in body ? String(body.code) : undefined,
    };
  }

  return res.json() as Promise<ApiResult<T>>;
});

export function redirectOnApiAuthFailure(result: ApiResult<unknown>): void {
  if (result.ok) return;
  if (
    result.code === "UNAUTHENTICATED" ||
    result.code === "FORBIDDEN" ||
    result.code === "NOT_PROVISIONED"
  ) {
    if (isClerkConfigured() && !isAuthDevBypass()) {
      redirect("/sign-in");
    }
    redirect("/");
  }
}
