export const APP_CONFIG = {
  BASENAME: '',
  
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

  // If no basename is set, just ensure the path starts with a single leading slash
  if (!APP_CONFIG.BASENAME) {
    return `/${cleanPath}`;
  }

  return `${APP_CONFIG.BASENAME}/${cleanPath}`;
};

// Helper function to get relative path (without basename)
export const getRelativePath = (fullPath: string): string => {
  // If no basename is configured, just return the original path
  if (!APP_CONFIG.BASENAME) {
    return fullPath;
  }

  if (fullPath.startsWith(APP_CONFIG.BASENAME)) {
    return fullPath.slice(APP_CONFIG.BASENAME.length) || '/';
  }

  return fullPath;
};
