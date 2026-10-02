import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "^/api/v1/generate(?:\\?|$)": {
          target: env.BACKEND_URL || "http://127.0.0.1:8080",
          rewrite: (path) => path.replace(/^\/api\/v1\/generate/, "/generate"),
          timeout: 75000,
          proxyTimeout: 75000,
          configure: (proxy) => {
            proxy.on("proxyReq", (upstream, request, response) => {
              request.on("aborted", () => upstream.destroy());
              response.on("close", () => {
                if (!response.writableFinished) upstream.destroy();
              });
            });
          },
        },
      },
    },
  };
});
