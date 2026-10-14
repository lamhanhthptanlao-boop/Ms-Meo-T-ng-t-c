import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'MS MEO - Trắc nghiệm cử chỉ',
          short_name: 'MS MEO',
          description: 'Ứng dụng trắc nghiệm bằng cử chỉ khuôn mặt và bàn tay cho học sinh.',
          theme_color: '#FFB7CE',
          icons: [
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/0/05/Hello_kitty_character_portrait.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
