import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  const frontendPort = parseInt(env.VITE_PORT || '2000');
  const backendPort = parseInt(env.PORT || '2001');

  return {
    plugins: [vue()],
    server: {
      port: frontendPort,
      proxy: {
        "^/api/.*": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
