// Application Configuration Constants
export const APP_CONFIG = {
  // Base path for the application when deployed under a subdirectory
  BASENAME: '/staging/tgnpdcl',
  
  // API Configuration
  API_TIMEOUT: 10000,
  
  // App Information
  APP_NAME: 'TGNPDCL',
  COMPANY_NAME: 'Best Infra',
  
  // Feature Flags
  ENABLE_DARK_MODE: true,
  ENABLE_MULTI_LANGUAGE: false,
  ENABLE_LOGGING: true,
} as const;

// Helper function to get full path with basename
export const getFullPath = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${APP_CONFIG.BASENAME}/${cleanPath}`;
};

// Helper function to get relative path (without basename)
export const getRelativePath = (fullPath: string): string => {
  if (fullPath.startsWith(APP_CONFIG.BASENAME)) {
    return fullPath.slice(APP_CONFIG.BASENAME.length) || '/';
  }
  return fullPath;
};
