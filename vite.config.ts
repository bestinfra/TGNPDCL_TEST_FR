import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
export default defineConfig({
  base: '/v2/tgnpdcl_smart/',
  plugins: [
    react(),
    federation({
      name: 'tgnpdcl',
      remotes: {
        //  SuperAdmin: 'http://localhost:4173/admin/assets/remoteEntry.js',
       SuperAdmin: 'https://bestinfra.app/admin/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@context': path.resolve(__dirname, './src/context'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
  server: {
    port: 1700,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4249',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  publicDir: 'public',
});