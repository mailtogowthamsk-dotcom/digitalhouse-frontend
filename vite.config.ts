import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/digitalhouse/backend": {
    target: "http://localhost:4000",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/digitalhouse\/backend/, "")
  }
};

export default defineConfig({
  base: "/digitalhouse/admin/",
  plugins: [react()],
  server: {
    port: 3001,
    proxy: apiProxy
  },
  preview: {
    port: 3001,
    proxy: apiProxy
  }
});
