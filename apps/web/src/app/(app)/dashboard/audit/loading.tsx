import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeletons";

export default function AuditLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex-1 px-4 py-5 md:px-6 md:py-6">
        <TableSkeleton rows={8} />
      </div>
    </>
  );
}
