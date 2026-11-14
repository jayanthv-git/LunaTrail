import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({mode})=>({
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1",
    watch: { ignored: ["**/backend/**", "**/data/**", "**/reports/**"] }, proxy: { "/api": `http://127.0.0.1:${loadEnv(mode,".","").LUNATRAIL_API_PORT||8000}` } },
}));
