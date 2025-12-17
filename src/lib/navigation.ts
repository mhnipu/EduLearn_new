/**
 * Navigation Utilities
 * 
 * Centralized functions for navigation logic including
 * role-based dashboard paths and history management
 */

type AppRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'guardian' | null;

/**
 * Get the appropriate dashboard path based on user role
 */
export function getDashboardPath(role: AppRole): string {
  if (!role) return '/dashboard';
  if (role === 'super_admin' || role === 'admin') return '/dashboard/admin';
  return `/dashboard/${role}`;
}

/**
 * Check if browser history allows back navigation
 * Note: This is a best-effort check as browser history API is limited
 */
export function canGoBack(): boolean {
  // Check if we have history entries
  // window.history.length > 1 indicates there's at least one previous page
  // However, this isn't always reliable, so we also check sessionStorage
  if (typeof window === 'undefined') return false;
  
  // Check browser history length
  const hasHistory = window.history.length > 1;
  
  // Check if we have a stored previous path
  const storedPath = sessionStorage.getItem('previousPath');
  const hasStoredPath = storedPath && storedPath !== window.location.pathname;
  
  return hasHistory || hasStoredPath;
}

/**
 * Get fallback path when no history is available
 */
export function getFallbackPath(role: AppRole, currentPath?: string): string {
  // If we have a role, use role-based dashboard
  if (role) {
    return getDashboardPath(role);
  }
  
  // If no role, check if we're on a protected route
  // In that case, go to auth with return path
  if (currentPath && currentPath !== '/auth' && currentPath !== '/') {
    return '/auth';
  }
  
  // Ultimate fallback
  return '/dashboard';
}

/**
 * Store the current path as previous path for navigation
 */
export function storePreviousPath(path: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('previousPath', path);
  }
}

/**
 * Get stored previous path
 */
export function getStoredPreviousPath(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('previousPath');
}

/**
 * Clear stored previous path
 */
export function clearStoredPreviousPath(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('previousPath');
  }
}
