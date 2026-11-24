import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project sites are served under /<repo>/.
export default defineConfig({
  base: process.env.SITE_BASE ?? "/tw-weekly-candidates/",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        fixedPool: fileURLToPath(new URL("./fixed-pool/index.html", import.meta.url)),
      },
    },
  },
});
