import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

// Header background colors for light and dark mode
const HEADER_BG_COLOR_LIGHT = "#F3E5DD";
const HEADER_BG_COLOR_DARK = "#D77F37";

export interface ColumnDef<T> {
  id: string;
  header: string | React.ReactNode;
  accessor?: keyof T | ((row: T) => any);
  cell?: (row: T) => React.ReactNode;
  cellType?: 'text' | 'checkbox' | 'badge' | 'button' | 'icon' | 'custom';
  sticky?: 'left' | 'right' | false;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: string | number;
  className?: string;
  headerClassName?: string;
  // For predefined types
  checkboxProps?: (row: T) => { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean };
  badgeProps?: (row: T) => { variant?: "default" | "secondary" | "destructive" | "outline"; children: React.ReactNode; className?: string };
  buttonProps?: (row: T) => { onClick: () => void; children: React.ReactNode; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "icon"; disabled?: boolean; className?: string };
}

export interface ParentTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  stickyHeader?: boolean;
  scrollHeight?: string;
  onRowClick?: (row: T) => void;
  getRowKey?: (row: T, index: number) => string | number;
}

export function ParentTable<T extends Record<string, any>>({
  columns = [],
  data = [],
  emptyState,
  loading = false,
  className,
  headerClassName,
  rowClassName,
  stickyHeader = true,
  scrollHeight = "h-[550px]",
  onRowClick,
  getRowKey,
}: ParentTableProps<T>) {
  const { theme } = useTheme();
  const headerBgColor = theme === 'dark' ? HEADER_BG_COLOR_DARK : HEADER_BG_COLOR_LIGHT;
  
  // Safety check: ensure columns is an array
  if (!Array.isArray(columns) || columns.length === 0) {
    return null;
  }
  const getCellContent = (column: ColumnDef<T>, row: T): React.ReactNode => {
    // Custom render function takes precedence
    if (column.cell) {
      return column.cell(row);
    }

    // Predefined cell types
    switch (column.cellType) {
      case 'checkbox':
        if (column.checkboxProps) {
          const props = column.checkboxProps(row);
          return (
            <Checkbox
              checked={props.checked}
              onCheckedChange={props.onCheckedChange}
              disabled={props.disabled}
            />
          );
        }
        break;

      case 'badge':
        if (column.badgeProps) {
          const props = column.badgeProps(row);
          return (
            <Badge variant={props.variant} className={props.className}>
              {props.children}
            </Badge>
          );
        }
        break;

      case 'button':
        if (column.buttonProps) {
          const props = column.buttonProps(row);
          return (
            <Button
              variant={props.variant || "ghost"}
              size={props.size || "sm"}
              onClick={props.onClick}
              disabled={props.disabled}
              className={props.className}
            >
              {props.children}
            </Button>
          );
        }
        break;

      case 'text':
      default:
        // Use accessor to get value
        if (column.accessor) {
          const value = typeof column.accessor === 'function'
            ? column.accessor(row)
            : row[column.accessor];
          return <span>{value}</span>;
        }
        break;
    }

    return null;
  };

  const getRowClassName = (row: T, index: number): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row, index);
    }
    return rowClassName || '';
  };

  const defaultEmptyState = (
    <TableRow>
      <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <p>No data available</p>
        </div>
      </TableCell>
    </TableRow>
  );

  const tableContent = (
    <div className="min-w-max">
      <Table className={className}>
        <TableHeader className={cn(stickyHeader && "sticky top-0 z-20", headerClassName)}>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => {
              const stickyClasses = column.sticky === 'left'
                ? "sticky left-0 z-30 border-r"
                : column.sticky === 'right'
                ? "sticky right-0 z-30 border-l"
                : "";

              const alignClass = column.align === 'center'
                ? "text-center"
                : column.align === 'right'
                ? "text-right"
                : "text-left";

              const widthStyle = column.width
                ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width }
                : {};

              const minWidthStyle = column.minWidth
                ? { minWidth: typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth }
                : {};

              return (
                <TableHead
                  key={column.id}
                  className={cn(
                    alignClass,
                    stickyClasses,
                    column.headerClassName,
                    "text-gray-900"
                  )}
                  style={{
                    backgroundColor: headerBgColor,
                    ...widthStyle,
                    ...minWidthStyle,
                  }}
                >
                  {column.header}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                {emptyState || <p>No data available</p>}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => {
              const rowClass = getRowClassName(row, rowIndex);
              const rowKey = getRowKey ? getRowKey(row, rowIndex) : (row.id || rowIndex);
              return (
                <TableRow
                  key={rowKey}
                  className={cn(
                    rowClass,
                    onRowClick && "cursor-pointer",
                    "group"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => {
                    const stickyClasses = column.sticky === 'left'
                      ? "sticky left-0 z-10 border-r bg-background group-hover:bg-muted/30 transition-colors"
                      : column.sticky === 'right'
                      ? "sticky right-0 z-10 border-l bg-background group-hover:bg-muted/30 transition-colors"
                      : "";

                    const alignClass = column.align === 'center'
                      ? "text-center"
                      : column.align === 'right'
                      ? "text-right"
                      : "text-left";

                    const widthStyle = column.width
                      ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width }
                      : {};

                    const minWidthStyle = column.minWidth
                      ? { minWidth: typeof column.minWidth === 'number' ? `${column.minWidth}px` : column.minWidth }
                      : {};

                    return (
                      <TableCell
                        key={column.id}
                        className={cn(
                          alignClass,
                          stickyClasses,
                          column.className
                        )}
                        style={{
                          ...widthStyle,
                          ...minWidthStyle,
                        }}
                      >
                        {getCellContent(column, row)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (scrollHeight) {
    return (
      <ScrollArea className={scrollHeight}>
        {tableContent}
      </ScrollArea>
    );
  }

  return tableContent;
}

