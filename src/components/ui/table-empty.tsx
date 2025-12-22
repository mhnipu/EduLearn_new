import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TableEmptyStateProps {
  icon?: LucideIcon;
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function TableEmptyState({
  icon: Icon,
  message = "No data found",
  description,
  actionLabel,
  onAction,
  className,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={1000} className={cn("h-[400px]", className)}>
        <div className="flex flex-col items-center justify-center h-full py-12">
          {Icon && (
            <div className="mb-4 p-4 rounded-full bg-muted/50">
              <Icon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-1">{message}</h3>
          {description && (
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{description}</p>
          )}
          {actionLabel && onAction && (
            <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
              {actionLabel}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

