"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { ApiResult } from "@vaikuntham/shared";
import {
  authFailureRedirectPath,
  isAuthFailureResult,
} from "@/lib/api/auth-failure";

/** Redirect on auth failures from client mutations (CB-152). */
export function useAuthFailureHandler() {
  const router = useRouter();

  return useCallback(
    (result: ApiResult<unknown>): boolean => {
      if (result.ok) return false;
      const path = authFailureRedirectPath(result.code);
      if (path) router.push(path);
      return Boolean(path);
    },
    [router],
  );
}
