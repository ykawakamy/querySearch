import * as esbuild from "esbuild";
import fs from 'node:fs';

const isProdution = process.argv.includes("production");
const sourcemap = !isProdution;

      // TODO: vsce package is not support symlink. see https://github.com/microsoft/vscode-vsce/issues/308
fs.copyFileSync("node_modules/treeview-on-vscode-webview/src/webview/vscc-treeview.css", "dist/vscc-treeview.css");

const result = await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  sourcemap: sourcemap,
  external: ["vscode", "@vscode/l10n"],
  outfile: "dist/extension.js",
});

await esbuild.build({
  entryPoints: ["src/webview/index.tsx"],
  bundle: true,
  sourcemap: sourcemap,
  outfile: "dist/webview.js",
});
