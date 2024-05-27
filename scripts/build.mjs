import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  sourcemap: "inline",
  external: ["vscode"],
  outfile: "dist/extension.js",
});


await esbuild.build({
  entryPoints: ["src/webview/index.tsx"],
  bundle: true,
  sourcemap: "inline",
  outfile: "dist/webview.js",
});
