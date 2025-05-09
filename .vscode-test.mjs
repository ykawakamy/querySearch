// .vscode-test.js
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  // files: "out/test/**/*.test.js",
  files: "src/test/**/*.test.ts",
  mocha:{
    timeout: 300000,
    require: ["ts-node/register"],
  },
});
