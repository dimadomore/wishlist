import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // `npm run dev:web` — фронт без воркера; API проксируем в `wrangler dev`.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
