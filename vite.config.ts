import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    envPrefix: ['VITE_', 'PUBLIC_', 'CLERK_'],
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpg'],
        manifest: {
          name: 'StudyFlow AI',
          short_name: 'StudyFlow',
          description: 'The only test prep AI with a built-in Fact-Checker.',
          theme_color: '#FAFAFA',
          icons: [
            {
              src: '/logo.jpg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: '/logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
          maximumFileSizeToCacheInBytes: 3000000
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            framer: ['motion/react', 'motion'],
            clerk: ['@clerk/clerk-react', '@clerk/themes'],
            ui: ['lucide-react', 'katex']
          }
        }
      }
    },
    esbuild: {
      drop: ['debugger'] as any,
      pure: ['console.log', 'console.info', 'console.debug'],
    }
  };
});
