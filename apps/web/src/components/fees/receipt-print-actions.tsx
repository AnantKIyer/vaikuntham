"use client";

import { Button, ButtonLink } from "@/components/ui/button";

export function ReceiptPrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 print:hidden">
      <Button type="button" onClick={() => window.print()}>
        Print receipt
      </Button>
      <ButtonLink href={backHref} variant="ghost">
        Back to fees
      </ButtonLink>
    </div>
  );
}
