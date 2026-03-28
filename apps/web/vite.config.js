import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
const devPort = Number(process.env.VITE_DEV_PORT ?? "5174");
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8001";
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
        include: ["react", "react-dom"],
        force: true,
    },
    server: {
        port: devPort,
        proxy: {
            "/api": {
                target: apiProxyTarget,
                changeOrigin: true
            }
        }
    },
    test: {
        environment: "node",
        exclude: [
            "**/node_modules/**",
            "**/node_modules.*/**",
            "**/.npm-cache*/**",
        ],
    }
});
