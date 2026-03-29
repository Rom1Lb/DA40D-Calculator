import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/DA40D-Calculator/",
  plugins: [react()],
  // Required for react-router BrowserRouter on GitHub Pages
  // 404.html trick or use HashRouter — see README
});
