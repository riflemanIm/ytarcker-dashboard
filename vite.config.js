import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import pkg from "./package.json";
// ----------------------------------------------------------------------

export default defineConfig(({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), "VITE_APP_");
  // console.log("env", env);
  const appVersion = pkg.version;
  const buildTime = new Date().toISOString();
  return {
    plugins: [
      react(),
      {
        name: "emit-version-json",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({
              version: appVersion,
              buildTime,
            }),
          });
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url?.split("?")[0];
            if (url !== "/version.json") return next();
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                version: appVersion,
                buildTime,
              }),
            );
          });
        },
      },
    ],
    // https://github.com/jpuri/react-draft-wysiwyg/issues/1317
    base: "./", // accessing env variable is not possible here. So hard coding this.
    build: {
      outDir: "./build",
    },
    define: {
      global: "window",
      __APP_VERSION__: JSON.stringify(appVersion),
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
