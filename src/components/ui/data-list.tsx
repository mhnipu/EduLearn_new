import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TableEmptyState } from "@/components/ui/table-empty";

export interface DataListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  loading?: boolean;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  className?: string;
  itemClassName?: string;
}

export function DataList<T>({
  data,
  renderItem,
  emptyMessage = "No data found",
  emptyDescription,
  emptyIcon: EmptyIcon,
  emptyActionLabel,
  onEmptyAction,
  loading = false,
  columns = { sm: 1, md: 2, lg: 3 },
  className,
  itemClassName,
}: DataListProps<T>) {
  const gridCols = cn(
    "grid gap-4",
    columns.sm === 1 && "grid-cols-1",
    columns.sm === 2 && "grid-cols-2",
    columns.sm === 3 && "grid-cols-3",
    columns.sm === 4 && "grid-cols-4",
    columns.md === 1 && "md:grid-cols-1",
    columns.md === 2 && "md:grid-cols-2",
    columns.md === 3 && "md:grid-cols-3",
    columns.md === 4 && "md:grid-cols-4",
    columns.lg === 1 && "lg:grid-cols-1",
    columns.lg === 2 && "lg:grid-cols-2",
    columns.lg === 3 && "lg:grid-cols-3",
    columns.lg === 4 && "lg:grid-cols-4",
    columns.xl === 1 && "xl:grid-cols-1",
    columns.xl === 2 && "xl:grid-cols-2",
    columns.xl === 3 && "xl:grid-cols-3",
    columns.xl === 4 && "xl:grid-cols-4"
  );

  if (loading) {
    return (
      <div className={cn(gridCols, className)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <div className="text-center">
          {EmptyIcon && (
            <div className="mb-4 p-4 rounded-full bg-muted/50 inline-block">
              <EmptyIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-1">{emptyMessage}</h3>
          {emptyDescription && (
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{emptyDescription}</p>
          )}
          {emptyActionLabel && onEmptyAction && (
            <button
              onClick={onEmptyAction}
              className="mt-2 px-4 py-2 text-sm font-medium text-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              {emptyActionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(gridCols, className)}>
      {data.map((item, index) => (
        <Card key={index} className={cn("shadow-sm hover:shadow-md transition-shadow", itemClassName)}>
          <CardContent className="p-6">{renderItem(item, index)}</CardContent>
        </Card>
      ))}
    </div>
  );
}

