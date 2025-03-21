import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// ----------------------------------------------------------------------

export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), "VITE_APP_");
  // console.log("env", env);
  return {
    plugins: [react()],
    // https://github.com/jpuri/react-draft-wysiwyg/issues/1317
    base: "./", // accessing env variable is not possible here. So hard coding this.
    build: {
      outDir: "./build",
    },
    define: {
      global: "window",
    },

    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "#root": resolve(__dirname),
      },
    },
    server: {
      // this ensures that the browser opens upon server start
      open: true,
      // this sets a default port to 3007
      port: 3007,
    },
    preview: {
      // this ensures that the browser opens upon preview start
      open: true,
      // this sets a default port to 3007
      port: 3007,
    },
  };
});
