import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";

export interface TimePickerProps {
  value?: string; // Format: "HH:MM" (24-hour)
  onChange: (time: string) => void; // Returns "HH:MM" format
  disabled?: boolean;
  className?: string;
  id?: string;
  use12Hour?: boolean; // Whether to use 12-hour format
}

export function TimePicker({
  value = "",
  onChange,
  disabled,
  className,
  id,
  use12Hour = true,
}: TimePickerProps) {
  // Parse value into hours and minutes (always return valid values)
  const [hours, minutes] = React.useMemo(() => {
    if (!value || value.trim() === "") {
      // If no value provided, use 12:00 as default but this shouldn't happen when used properly
      return [12, 0];
    }
    const [h, m] = value.split(":").map(Number);
    return [isNaN(h) ? 12 : h, isNaN(m) ? 0 : m];
  }, [value]);

  // For 12-hour format: convert 24-hour to 12-hour display
  const displayHours = use12Hour
    ? hours === 0
      ? 12
      : hours > 12
      ? hours - 12
      : hours
    : hours;
  const period = use12Hour ? (hours >= 12 ? "PM" : "AM") : undefined;

  // Generate hour options
  const hourOptions = React.useMemo(() => {
    if (use12Hour) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    return Array.from({ length: 24 }, (_, i) => i);
  }, [use12Hour]);

  // Generate minute options (every 5 minutes for better UX)
  const minuteOptions = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, 15, ... 55
  }, []);

  const handleHourChange = (newHour: string) => {
    const hourNum = parseInt(newHour, 10);
    let hour24 = hourNum;

    if (use12Hour && period) {
      if (period === "PM" && hourNum !== 12) {
        hour24 = hourNum + 12;
      } else if (period === "AM" && hourNum === 12) {
        hour24 = 0;
      } else {
        hour24 = hourNum;
      }
    }

    const newTime = `${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    onChange(newTime);
  };

  const handleMinuteChange = (newMinute: string) => {
    const minuteNum = parseInt(newMinute, 10);
    const newTime = `${String(hours).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}`;
    onChange(newTime);
  };

  const handlePeriodChange = (newPeriod: string) => {
    let hour24 = hours;
    if (newPeriod === "PM" && hours < 12) {
      hour24 = hours + 12;
    } else if (newPeriod === "AM" && hours >= 12) {
      hour24 = hours - 12;
    }

    const newTime = `${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    onChange(newTime);
  };

  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        <Clock className="h-4 w-4" />
        <span>Disabled</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)} id={id}>
      {/* Hour Select */}
      <Select
        value={String(displayHours)}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[60px] h-9 text-sm font-medium px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[180px]">
          {hourOptions.map((hour) => (
            <SelectItem key={hour} value={String(hour)} className="text-sm">
              {String(hour).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Separator */}
      <span className="text-base font-semibold text-muted-foreground">:</span>

      {/* Minute Select */}
      <Select
        value={String(minutes)}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[60px] h-9 text-sm font-medium px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[180px]">
          {minuteOptions.map((minute) => (
            <SelectItem key={minute} value={String(minute)} className="text-sm">
              {String(minute).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM Select (only for 12-hour format) */}
      {use12Hour && period && (
        <Select
          value={period}
          onValueChange={handlePeriodChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[55px] h-9 text-sm font-medium px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM" className="text-sm">AM</SelectItem>
            <SelectItem value="PM" className="text-sm">PM</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

