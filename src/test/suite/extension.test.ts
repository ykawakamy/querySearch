
import { after } from "mocha";

import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  after(() => {
    void vscode.window.showInformationMessage("All tests done!");
  });

  suiteSetup(async () => {});
});
