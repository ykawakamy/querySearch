(function () {
  const vscode = acquireVsCodeApi();

  const state = vscode.getState() || {};

  const $searchExpr = document.querySelector("#query-expr");
  const $replaceExpr = document.querySelector("#replace-expr");
  const $replaceToggleOn = document.querySelector("#query-replace-toggle-on");
  const $replaceToggleOff = document.querySelector("#query-replace-toggle-off");
  const $filterContainer = document.querySelector("#filter-container");
  const $filterIncludes = document.querySelector("#filter-includes");
  const $filterExcludes = document.querySelector("#filter-excludes");

  // Event Handler
  document.querySelector("#do-search").addEventListener("click", () => {
    state.searchExpr = $searchExpr.value;
    state.filterIncludes = $filterIncludes.value;
    state.filterExcludes = $filterExcludes.value;
    vscode.setState(state);

    vscode.postMessage({
      type: "do-search",
      queryExpr: $searchExpr.value,
      filterIncludes: $filterIncludes.value,
      filterExcludes: $filterExcludes.value,
    });
  });
  const refreshShowReplaceToggle = () => {
    $replaceExpr.style.display = state.replaceToggle ? "block" : "none";
    $replaceToggleOn.style.display = state.replaceToggle ? "block" : "none";
    $replaceToggleOff.style.display = !state.replaceToggle ? "block" : "none";
  };
  document
    .querySelector("#query-replace-toggle")
    .addEventListener("click", () => {
      state.replaceToggle = !state.replaceToggle;
      vscode.setState(state);

      vscode.postMessage({
        type: "query-replace-toggle",
        hidden: state.replaceToggle,
      });
      refreshShowReplaceToggle();
    });

  const refreshShowFilter = () => {
    $filterContainer.style.display = state.filterToggle ? "block" : "none";
  };
  document.querySelector("#filter-toggle").addEventListener("click", () => {
    state.filterToggle = !state.filterToggle;
    vscode.setState(state);

    vscode.postMessage({ type: "filter-toggle", hidden: state.filterToggle });
    refreshShowFilter();
  });

  const updateReplaceExpr = () => {
    state.replaceExpr = $replaceExpr.value;
    vscode.setState(state);

    vscode.postMessage({
      type: "change-replace",
      replaceExpr: state.replaceExpr,
    });
  };
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

  //
  $searchExpr.value = state.searchExpr ?? "";
  $replaceExpr.value = state.replaceExpr ?? "";
  $filterIncludes.value = state.filterIncludes ?? "";
  $filterExcludes.value = state.filterExcludes ?? "";
  refreshShowReplaceToggle();
  refreshShowFilter();
  
})();
