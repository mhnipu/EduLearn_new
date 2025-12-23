import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  className?: string;
  id?: string;
}

export function DateTimePicker({
  date,
  onDateChange,
  label = "Select Date & Time",
  placeholder = "Pick a date and time",
  helperText,
  error,
  disabled,
  minDate,
  maxDate,
  required,
  className,
  id,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [timeValue, setTimeValue] = React.useState<string>("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Initialize time value from date
  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setTimeValue(`${hours}:${minutes}`);
    } else {
      setSelectedDate(undefined);
      setTimeValue("");
    }
  }, [date]);

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) {
      setSelectedDate(undefined);
      setTimeValue("");
      onDateChange(undefined);
      return;
    }

    // If we already have a time, preserve it; otherwise default to 12:00 PM
    let newDate = selected;
    if (timeValue && timeValue.trim() !== "") {
      const [hours, minutes] = timeValue.split(":").map(Number);
      newDate = new Date(selected);
      newDate.setHours(hours, minutes || 0, 0, 0);
    } else {
      // Default to 12:00 PM (noon) for better UX
      newDate = new Date(selected);
      newDate.setHours(12, 0, 0, 0);
      const defaultTime = "12:00";
      setTimeValue(defaultTime);
    }

    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);

    if (time && selectedDate) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours || 0, minutes || 0, 0, 0);
      setSelectedDate(newDate);
      onDateChange(newDate);
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;
    
    setSelectedDate(now);
    setTimeValue(timeStr);
    onDateChange(now);
  };

  const displayValue = selectedDate
    ? `${format(selectedDate, "PPP")} at ${format(selectedDate, "h:mm a")}`
    : "";

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-semibold flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-primary" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-11",
              !selectedDate && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2 space-y-3">
            {/* Today Button */}
            <div className="flex justify-end px-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSetToday}
                className="h-7 text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Today
              </Button>
            </div>
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (disabled) return true;
                // Compare dates ignoring time
                if (minDate) {
                  const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  if (dateOnly < minDateOnly) return true;
                }
                if (maxDate) {
                  const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  if (dateOnly > maxDateOnly) return true;
                }
                return false;
              }}
              initialFocus
              className="p-2"
              classNames={{
                months: "flex flex-col space-y-3",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                row: "flex w-full mt-1",
                cell: "h-7 w-7 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 text-sm",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
            {selectedDate && (
              <div className="border-t pt-2.5 px-1 pb-1">
                <Label className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Time
                </Label>
                <TimePicker
                  value={timeValue}
                  onChange={handleTimeChange}
                  disabled={disabled}
                  use12Hour={true}
                  className="w-full justify-center"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Helper Text and Validation */}
      <div className="space-y-1">
        {error ? (
          <p id={`${id}-error`} className="text-xs text-destructive flex items-center gap-1.5">
            {error}
          </p>
        ) : (
          helperText && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )
        )}
      </div>
    </div>
  );
}

