import * as vscode from "vscode";
import { SearchQueryPanelProvider } from "./view/search-query-panel";
import { SearchResultPanelProvider } from "./view/search-result-panel";
import { ReplacePreviewDocumentProvider } from "./view/replace-preview";
import { NodeHtmlParserAdaptor } from "./engine/node-html-parser";

export function activate(context: vscode.ExtensionContext) {
  const searchEngine = new NodeHtmlParserAdaptor();
  const result = new SearchResultPanelProvider(searchEngine);
  result.init(context);
  new SearchQueryPanelProvider(context, result);
  new ReplacePreviewDocumentProvider(searchEngine).init(context);
  
}

export function deactivate() {}
