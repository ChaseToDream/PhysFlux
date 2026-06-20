import { defineConfig } from 'vite';

// 物绘流光 PhysFlux - Vite 配置
// 纯原生 JS + Canvas，无框架依赖
export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true,
    // 允许局域网访问，便于移动端调试（应用支持移动端面板切换）
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 目标现代浏览器，避免输出过新语法导致部分 evergreen 浏览器不兼容
    target: 'es2020',
    // 单页应用，关闭未使用的 chunk 拆分告警阈值上调
    chunkSizeWarningLimit: 700,
  },
});
