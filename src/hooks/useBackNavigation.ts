/**
 * useBackNavigation Hook
 * 
 * Provides smart back navigation that uses browser history when available,
 * with intelligent fallbacks to role-based dashboards or stored paths.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getDashboardPath, canGoBack, getFallbackPath, getStoredPreviousPath, storePreviousPath } from '@/lib/navigation';
import { useEffect } from 'react';

export interface UseBackNavigationOptions {
  fallbackPath?: string;
  fallbackLabel?: string;
  preserveState?: boolean;
}

export interface BackNavigationResult {
  goBack: () => void;
  canGoBack: boolean;
  fallbackPath: string;
  fallbackLabel: string;
}

/**
 * Hook for smart back navigation
 * 
 * @param options - Configuration options
 * @returns Navigation functions and state
 */
export function useBackNavigation(options: UseBackNavigationOptions = {}): BackNavigationResult {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const {
    fallbackPath: customFallbackPath,
    fallbackLabel: customFallbackLabel,
    preserveState = true,
  } = options;

  // Store current path as previous path when component mounts
  useEffect(() => {
    if (location.pathname && location.pathname !== '/auth') {
      storePreviousPath(location.pathname);
    }
  }, [location.pathname]);

  // Determine if we can go back
  const hasHistory = canGoBack();
  const hasFromState = !!location.state?.from;
  const storedPath = getStoredPreviousPath();
  const hasStoredPath = storedPath && storedPath !== location.pathname;

  // Determine fallback path
  const computedFallbackPath = customFallbackPath || getFallbackPath(role, location.pathname);
  const fallbackPath = hasFromState ? (location.state.from as string) : computedFallbackPath;

  // Determine fallback label
  const getFallbackLabel = () => {
    if (customFallbackLabel) return customFallbackLabel;
    
    if (hasFromState) {
      return 'Back';
    }
    
    if (role) {
      if (role === 'super_admin' || role === 'admin') {
        return 'Back to Admin Dashboard';
      }
      return `Back to ${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`;
    }
    
    return 'Back to Dashboard';
  };

  const fallbackLabel = getFallbackLabel();

  // Determine if we can actually go back
  const canNavigateBack = hasHistory || hasFromState || hasStoredPath;

  /**
   * Navigate back with smart fallback
   */
  const goBack = () => {
    // Priority 1: Use location.state.from if available (from ProtectedRoute redirects)
    if (hasFromState && preserveState) {
      navigate(location.state.from as string, { 
        state: location.state,
        replace: false 
      });
      return;
    }

    // Priority 2: Use stored previous path if available
    if (hasStoredPath && storedPath) {
      navigate(storedPath, { replace: false });
      return;
    }

    // Priority 3: Try browser back navigation
    if (hasHistory) {
      navigate(-1);
      return;
    }

    // Priority 4: Fallback to role-based dashboard or custom path
    navigate(fallbackPath, { replace: false });
  };

  return {
    goBack,
    canGoBack: canNavigateBack,
    fallbackPath,
    fallbackLabel,
  };
}
