import * as vscode from "vscode";
import { SearchQueryPanelProvider } from "./view/search-query-panel";
import { SearchResultPanelProvider } from "./view/search-result-panel";

export function activate(context: vscode.ExtensionContext) {
  const result = new SearchResultPanelProvider();
  result.init(context);
  new SearchQueryPanelProvider(context, result);
}

export function deactivate() {}
