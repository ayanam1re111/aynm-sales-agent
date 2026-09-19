import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端没有任何 CORS 配置，跨端口直连会被浏览器拦截（且 JSON 请求会触发 preflight）。
// 这里用 dev proxy 把 /api 转发到后端，浏览器视作同源，彻底绕开 CORS。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // SSE 必须逐 token 推送，禁用任何中间层缓冲
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
        },
      },
    },
  },
})
