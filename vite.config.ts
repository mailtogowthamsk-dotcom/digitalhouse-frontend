import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  "/digitalhouse/backend": {
    target: "http://localhost:4000",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/digitalhouse\/backend/, ""),
    configure: (proxy) => {
      proxy.on("error", (_err, _req, res) => {
        if (res && "writeHead" in res && !res.headersSent) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              message:
                "Backend API is not running. In another terminal: cd backend && npm run dev (port 4000)."
            })
          );
        }
      });
    }
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
