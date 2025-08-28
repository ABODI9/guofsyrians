import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // نحمّل .env هنا بدل process.env
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_URL || 'http://localhost:8000' // هدف البروكسي أثناء التطوير

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: [
        'app2.guofsyrians.org',
        'app.guofsyrians.org',
        'localhost',
        '127.0.0.1',
        'guofsyrians.ctf.web.tr',
        'guofsyrians-api.ctf.web.tr',
      ],
      watch: { usePolling: true },
      cors: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: p => p, // لا نغيّر المسار
        },
      },
    },
    resolve: {
      alias: { '@': '/src', '@components': '/src/components' },
    },
  }
})
