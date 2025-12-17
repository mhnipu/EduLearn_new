/**
 * BackButton Component
 * 
 * Reusable button component that provides smart back navigation
 * using the useBackNavigation hook.
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useBackNavigation, UseBackNavigationOptions } from '@/hooks/useBackNavigation';
import { ButtonProps } from '@/components/ui/button';

export interface BackButtonProps extends Omit<ButtonProps, 'onClick' | 'children'>, UseBackNavigationOptions {
  label?: string;
  showIcon?: boolean;
}

/**
 * BackButton component with smart navigation
 * 
 * @param props - Button props and navigation options
 */
export function BackButton({
  label,
  fallbackPath,
  fallbackLabel,
  preserveState,
  showIcon = true,
  variant = 'ghost',
  size,
  ...buttonProps
}: BackButtonProps) {
  const { goBack, canGoBack, fallbackLabel: computedLabel } = useBackNavigation({
    fallbackPath,
    fallbackLabel,
    preserveState,
  });

  // Use custom label if provided, otherwise use computed label
  const displayLabel = label || (canGoBack ? 'Back' : computedLabel);
  
  // For icon-only buttons, don't show label and adjust icon spacing
  const isIconOnly = size === 'icon';
  const iconClassName = isIconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4';

  return (
    <Button
      variant={variant}
      onClick={goBack}
      size={size}
      {...buttonProps}
    >
      {showIcon && <ArrowLeft className={iconClassName} />}
      {!isIconOnly && displayLabel}
    </Button>
  );
}
