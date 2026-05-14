import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "0.0.0"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Split large dependencies into separate chunks for better caching and lazy loading
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-markdown": ["react-markdown", "remark-gfm", "remark-gemoji", "remark-math", "rehype-raw", "rehype-katex", "katex"],
          "vendor-highlight": ["highlight.js", "rehype-highlight"],
        },
      },
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 600,
  },
}));
