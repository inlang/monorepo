import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import richSvg from "vite-plugin-react-rich-svg";
import { viteStaticCopy } from "vite-plugin-static-copy"
import rawPlugin from 'vite-raw-plugin';
import fs from 'fs';
import { execSync } from "child_process";

const PLUGIN_CODE_BASE_URL = process.env.PLUGIN_CODE_BASE_URL;
let vitePort: number | undefined = undefined;

let lastPluginBuildPort = -1

const buildPlugin = (force: boolean = false) => {

  if (PLUGIN_CODE_BASE_URL !==  undefined) {
    console.log('👷  building for production using url: ' + PLUGIN_CODE_BASE_URL);
    execSync(`PLUGIN_CODE_BASE_URL=${PLUGIN_CODE_BASE_URL} vite build -c vite.config.sandbox.ts`);
    return
  }

  if (!vitePort) {
    return 
  }

  if (lastPluginBuildPort === vitePort && !force) {
    console.log('skipping build ' + vitePort);
    return 
  }
  console.log('👷 building sandbox for port: ' + vitePort);
        
  // TODO call vite build sandbox to bundle plugin and copy loader/manifest
  execSync(`PLUGIN_CODE_BASE_URL=http://localhost:${vitePort}/ vite build -c vite.config.sandbox.ts`);
  lastPluginBuildPort = vitePort
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: 'before-build-or-update',
      async configResolved(config) {
        if (vitePort === undefined) {
          vitePort = config.server?.port || 5173; // Default port is 5173
        }
      },

      async buildStart() {
          console.log("✨️ buildStart - build plugin with pre configured port");
          buildPlugin()
      },

      async configureServer(server) {
        const pollServerPort = () => {
          const serverPort = (server as any)._currentServerPort;
          if (!serverPort) {
            setTimeout(() => {
              pollServerPort();
            }, 10);
            return;
          }
          
          if (serverPort !== vitePort) {
            vitePort = serverPort;
            console.log("initial port change detected - rebuild plugin");
            buildPlugin()
          }
        };
        pollServerPort();

        server.watcher.on("change", (...args) => {
          const serverPort = (server as any)._currentServerPort;
          if (serverPort !== vitePort) {
            vitePort = serverPort;
            // port change detected
            console.log("port change detected - rebuild plugin");
            buildPlugin()
          }
        });

        server.middlewares.use((req, res, next) => {
          console.log(req.url);
          if (req.url === '/plugin.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end(fs.readFileSync(path.resolve('dist_plugin/plugin.js')));
          } else {
            next();
          }
        });
      },

      // Hook into hot updates (watch mode)
      async handleHotUpdate({ file }) {
        console.log("hot update detected - rebuild plugin");
        buildPlugin(true)
        return null; // Return null to let Vite continue with its bundling
      },
    },
    react(),
    richSvg() as any /* any to avoid type problem*/,
    rawPlugin({ 
      // ejs templates for export
      fileRegex: /\.ejs$/
     }),
    // viteSingleFile(),
    viteStaticCopy({
      targets: [
        {
          src: '../dist_plugin/*',
          dest: '.'
        },
      ]
    }),
  ],
  define: {
    process: { env: {} },
  },
  root: path.resolve("src"),
  build: {
    minify: mode === "production",
    cssMinify: mode === "production",
    sourcemap: mode !== "production" ? "inline" : false,
    // target: "es2017",
    emptyOutDir: true,
    outDir: path.resolve("dist"),
    rollupOptions: {
      
      input: {
        ui: path.resolve("src/ui/index.html"),
      },
      output: [{
         entryFileNames: '[name].js', 
         format: 'es',
         manualChunks: undefined,
      }],
      onwarn: (warning, warn) => {
        // Suppress eval warnings - we use it in figma plugin loader to load the plugin
        if (warning.code === 'EVAL') {
          return;
        }
        warn(warning);
      }
    },
  },
  resolve: {
    alias: {
       "@ui": path.resolve("src/ui"),
       "@plugin": path.resolve("src/plugin"),
    },
  },
}));
