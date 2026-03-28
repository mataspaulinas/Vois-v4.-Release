import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true
      }
    }
  }
});

await server.listen();
server.printUrls();
await new Promise(() => {});
