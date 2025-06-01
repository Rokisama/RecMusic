import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  preview: {
    port: 5173,
    strictPort: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    origin: "http://0.0.0.0:8080",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    coverage: {
      provider: "istanbul",
      exclude: ["src/App.tsx",
        "src/main.tsx",
        "src/modules/helpers/models/Song.tsx",
        "src/modules/helpers/pages/NotFoundPage.tsx",
        "dist/assets/index-DO1VeTRM.js",
        "src/modules/home/pages/HomePage.tsx",
        "src/modules/auth/pages/LoginPage.tsx",
        "src/modules/auth/pages/RegisterPage.tsx"],
    },
  },
});
