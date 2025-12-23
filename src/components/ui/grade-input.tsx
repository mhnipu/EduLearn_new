import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Award } from "lucide-react";

export interface GradeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number | string;
  onChange: (value: number) => void;
  maxScore: number;
  label?: string;
  error?: string;
  showPercentage?: boolean;
  showSuccessIcon?: boolean;
  helperText?: string;
}

const GradeInput = React.forwardRef<HTMLInputElement, GradeInputProps>(
  (
    {
      className,
      value,
      onChange,
      maxScore,
      label = "Enter Grade",
      error,
      showPercentage = true,
      showSuccessIcon = true,
      helperText,
      disabled,
      ...props
    },
    ref
  ) => {
    const numericValue = typeof value === "string" ? parseFloat(value) || 0 : value;
    const isValid = !error && numericValue >= 0 && numericValue <= maxScore;
    const percentage = maxScore > 0 ? Math.round((numericValue / maxScore) * 100) : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty string for clearing
      if (inputValue === "") {
        onChange(0);
        return;
      }

      // Only allow numeric input
      if (/^\d*\.?\d*$/.test(inputValue)) {
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue)) {
          onChange(numValue);
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Clamp value to valid range on blur
      const numValue = parseFloat(e.target.value);
      if (!isNaN(numValue)) {
        if (numValue < 0) {
          onChange(0);
        } else if (numValue > maxScore) {
          onChange(maxScore);
        }
      }
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={props.id} className="text-sm font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          {label}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              "h-11 pr-10 text-base font-medium",
              "transition-all duration-200",
              error
                ? "border-destructive focus-visible:ring-destructive"
                : isValid && numericValue > 0
                ? "border-green-500 focus-visible:ring-green-500"
                : "border-border focus-visible:ring-primary",
              className
            )}
            placeholder={`0 - ${maxScore}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />
          
          {/* Success/Error Icon */}
          {!disabled && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : showSuccessIcon && isValid && numericValue > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : null}
            </div>
          )}
        </div>

        {/* Helper Text and Validation */}
        <div className="space-y-1">
          {error ? (
            <p id={`${props.id}-error`} className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          ) : (
            <>
              {helperText && (
                <p className="text-xs text-muted-foreground">{helperText}</p>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Valid range: <span className="font-medium text-foreground">0 - {maxScore}</span>
                </span>
                {showPercentage && numericValue > 0 && (
                  <span className={cn(
                    "font-semibold",
                    percentage >= 70 ? "text-green-600 dark:text-green-400" :
                    percentage >= 50 ? "text-orange-600 dark:text-orange-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {percentage}%
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);
GradeInput.displayName = "GradeInput";

export { GradeInput };

