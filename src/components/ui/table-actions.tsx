import * as React from "react";
import { LucideIcon, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface TableActionsProps {
  actions: TableAction[];
  align?: "start" | "end";
  className?: string;
}

export function TableActions({ actions, align = "end", className }: TableActionsProps) {
  if (actions.length === 0) return null;

  const destructiveActions = actions.filter((action) => action.variant === "destructive");
  const defaultActions = actions.filter((action) => action.variant !== "destructive");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          aria-label="Open actions menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {defaultActions.map((action, index) => (
          <DropdownMenuItem
            key={`default-${index}`}
            onClick={action.onClick}
            disabled={action.disabled}
            className="cursor-pointer"
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
        {defaultActions.length > 0 && destructiveActions.length > 0 && <DropdownMenuSeparator />}
        {destructiveActions.map((action, index) => (
          <DropdownMenuItem
            key={`destructive-${index}`}
            onClick={action.onClick}
            disabled={action.disabled}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

