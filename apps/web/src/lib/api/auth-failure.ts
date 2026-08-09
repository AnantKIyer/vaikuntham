import type { ApiResult } from "@vaikuntham/shared";

/** Map API auth failure codes to web redirect paths (CB-152). */
export function authFailureRedirectPath(
  code: string | undefined,
): string | null {
  switch (code) {
    case "UNAUTHENTICATED":
      return "/sign-in";
    case "NOT_PROVISIONED":
      return "/awaiting-access";
    case "FORBIDDEN":
      return "/no-permission";
    default:
      return null;
  }
}

export function isAuthFailureResult(result: ApiResult<unknown>): boolean {
  return (
    !result.ok &&
    (result.code === "UNAUTHENTICATED" ||
      result.code === "FORBIDDEN" ||
      result.code === "NOT_PROVISIONED")
  );
}
