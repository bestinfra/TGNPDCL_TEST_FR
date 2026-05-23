/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_SOCKET_ENABLED: string
  readonly VITE_SOCKET_IO_PATH: string
  readonly VITE_ENABLE_FRONTEND_LOGS: string
  readonly VITE_SUPER_ADMIN_URL: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declare module for SVG imports
declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Declare module for image imports
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Declare module for CSS imports
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

// Declare module for JSON imports
declare module '*.json' {
  const content: any;
  export default content;
}

declare module 'SuperAdmin/Table' {
  import type { ComponentType } from 'react';
  const Table: ComponentType<Record<string, unknown>>;
  export default Table;
}
