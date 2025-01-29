import path from "node:path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import generateFile from "vite-plugin-generate-file";
import react from "@vitejs/plugin-react";
import richSvg from "vite-plugin-react-rich-svg";
import { viteStaticCopy } from "vite-plugin-static-copy"
import rawPlugin from 'vite-raw-plugin';
import replace from '@rollup/plugin-replace';
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../manifest.json',
          dest: '.'
        },
        {
          src: '../src/plugin/loader.js',
          dest: '.'
        }
      ]
    }),
    {
      name: "replace-loader-placeholder",
      apply: "build",
      closeBundle() {
        const loaderPath = path.resolve("dist_plugin/loader.js");
        if (fs.existsSync(loaderPath)) {
          const fileContent = fs.readFileSync(loaderPath, "utf8");
          const replacedContent = fileContent.replace(
            /\[\[PLUGIN_CODE_BASE_URL\]\]/g,
            process.env.PLUGIN_CODE_BASE_URL || "not set"
          );
          fs.writeFileSync(loaderPath, replacedContent, "utf8");
          console.log(`Replaced [[PLUGIN_CODE_BASE_URL]] in ${loaderPath}`);
        } else {
          console.warn(`File ${loaderPath} does not exist.`);
        }
      },
    },
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
    outDir: path.resolve("dist_plugin"),
    rollupOptions: {
      input: {
        // ui: path.resolve("src/ui/index.html"),
        // pluginMin: path.resolve("src/plugin/pluginMin.ts"),
        plugin: path.resolve("src/plugin/plugin.ts"),
        // loader: path.resolve("src/plugin/loader.ts"),
      },
      output: [{
         entryFileNames: '[name].js', 
         format: 'es',
         manualChunks: undefined,
         inlineDynamicImports: true,
      }],
    },
  },
 
  
  // css: {
  //   // postcss: {
  //   //   plugins: [postcssUrl({ url: "inline" })],
  //   // },
  //   preprocessorOptions: {
  //     scss: {
  //       api: "modern-compiler",
  //     },
  //   },
  // },
  resolve: {
    alias: {
      // "@common": path.resolve("src/common"),
       "@ui": path.resolve("src/ui"),
       "@plugin": path.resolve("src/plugin"),
      // "@plugin": path.resolve("src/sandbox"),
    },
  },
}));
