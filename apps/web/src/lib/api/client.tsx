"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { ApiResult } from "@vaikuntham/shared";
import { isAuthDevBypass } from "@/lib/utils";
import { getPublicApiUrl } from "./config";

export type ApiClientFn = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiResult<T>>;

const ApiClientContext = createContext<ApiClientFn | null>(null);

async function fetchApi<T>(
  path: string,
  init: RequestInit | undefined,
  token: string | null,
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (isAuthDevBypass()) {
    headers.set("x-auth-dev-bypass", "true");
  }

  const res = await fetch(`${getPublicApiUrl()}${path}`, {
    ...init,
    headers,
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
}

function StaticApiClientProvider({ children }: { children: ReactNode }) {
  const client = useCallback<ApiClientFn>(
    (path, init) => fetchApi(path, init, null),
    [],
  );
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

function ClerkApiClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const client = useCallback<ApiClientFn>(
    async (path, init) => fetchApi(path, init, await getToken()),
    [getToken],
  );
  return (
    <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
  );
}

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const bypass = isAuthDevBypass();
  const hasPk = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_"),
  );
  const useClerk = hasPk && !bypass;

  const mode = useMemo(() => (useClerk ? "clerk" : "static"), [useClerk]);

  if (mode === "clerk") {
    return <ClerkApiClientProvider>{children}</ClerkApiClientProvider>;
  }
  return <StaticApiClientProvider>{children}</StaticApiClientProvider>;
}

export function useApiClient(): ApiClientFn {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used within ApiClientProvider");
  }
  return client;
}
