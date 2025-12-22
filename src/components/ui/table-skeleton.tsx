import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <>
      {showHeader && (
        <tr>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={`header-${colIndex}`} className="px-5 py-4">
              <Skeleton className="h-4 w-24" />
            </td>
          ))}
        </tr>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`row-${rowIndex}`} className={className}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={`cell-${rowIndex}-${colIndex}`} className="px-5 py-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

