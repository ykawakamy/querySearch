// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { colors: [] };

  /** @type {Array<{ value: string }>} */

  const $searchExpr = document.querySelector("#query-expr");
  const $replaceExpr = document.querySelector("#replace-expr");

  document.querySelector("#do-search").addEventListener("click", () => {
    vscode.postMessage({ type: "do-search", queryExpr: $searchExpr.value });
  });
  const updateReplaceExpr = () => {
    console.log("hoge");
    vscode.postMessage({ type: "change-replace", replaceExpr: $replaceExpr.value });
  };
  $replaceExpr.addEventListener("keyup", updateReplaceExpr);
  $replaceExpr.addEventListener("change", updateReplaceExpr);
  $replaceExpr.addEventListener("input", updateReplaceExpr);

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "prepare-replace": {
        const queryExpr = $replaceExpr;
        vscode.postMessage({
          type: "do-replace",
          replaceExpr: queryExpr.value,
        });
        break;
      }
      case "prepare-replace-all": {
        const queryExpr = $replaceExpr;
        vscode.postMessage({
          type: "do-replace-all",
          replaceExpr: queryExpr.value,
        });
        break;
      }
      case "prepare-replace-files": {
        const queryExpr = $replaceExpr;
        vscode.postMessage({
          type: "do-replace-files",
          replaceExpr: queryExpr.value,
        });
        break;
      }
    }
  });
})();
