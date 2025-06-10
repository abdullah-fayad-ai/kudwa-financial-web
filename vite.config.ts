import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Proxy API requests to the backend server
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5005",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
