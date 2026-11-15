import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1",
    watch: { ignored: ["**/backend/**", "**/data/**", "**/reports/**"] }, proxy: { "/api": "http://127.0.0.1:8000" } },
});
