import { defineConfig } from 'vite';

// 物绘流光 PhysFlux - Vite 配置
// 纯原生 JS + Canvas，无框架依赖
export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
