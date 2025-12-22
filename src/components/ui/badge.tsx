import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        active: "border-transparent bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        inactive: "border-transparent bg-muted text-muted-foreground",
        pending: "border-transparent bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
        approved: "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        rejected: "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  status?: "active" | "inactive" | "pending" | "approved" | "rejected" | string;
  statusColor?: string;
}

function Badge({ className, variant, status, statusColor, ...props }: BadgeProps) {
  // If status is provided, use it to determine variant
  let finalVariant = variant;
  if (status && !variant) {
    if (["active", "inactive", "pending", "approved", "rejected"].includes(status)) {
      finalVariant = status as "active" | "inactive" | "pending" | "approved" | "rejected";
    } else if (statusColor) {
      // Custom status with custom color
      return (
        <div
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
          style={{
            backgroundColor: `${statusColor}15`,
            color: statusColor,
            borderColor: `${statusColor}30`,
          }}
          {...props}
        />
      );
    }
  }

  return <div className={cn(badgeVariants({ variant: finalVariant }), className)} {...props} />;
}

// StatusBadge component for convenience
export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: "active" | "inactive" | "pending" | "approved" | "rejected" | string;
  statusColor?: string;
}

function StatusBadge({ status, statusColor, className, ...props }: StatusBadgeProps) {
  return <Badge status={status} statusColor={statusColor} className={className} {...props} />;
}

export { Badge, StatusBadge, badgeVariants };
