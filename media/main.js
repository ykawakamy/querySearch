// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { colors: [] };

  /** @type {Array<{ value: string }>} */

  document.querySelector("#do-search").addEventListener("click", () => {
    const queryExpr = document.querySelector("#query-expr");
    vscode.postMessage({ type: "do-search", queryExpr: queryExpr.value });
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "prepare-replace": {
        const queryExpr = document.querySelector("#replace-expr");
        vscode.postMessage({
          type: "do-replace",
          replaceExpr: queryExpr.value,
        });
        break;
      }
      case "prepare-replace-all": {
        const queryExpr = document.querySelector("#replace-expr");
        vscode.postMessage({
          type: "do-replace-all",
          replaceExpr: queryExpr.value,
        });
        break;
      }
    }
  });
})();
