import * as vscode from "vscode";
import { SearchQueryPanelProvider } from "./view/search-query-panel";
import { SearchResultPanelProvider } from "./view/search-result-panel";
import { ReplacePreviewDocumentProvider } from "./view/replace-preview";
import { NodeHtmlParserAdaptor } from "./engine/node-html-parser";
import { JsxHtmlParserAdapter } from "./engine/jsx-htmlnode-parser";

export function activate(context: vscode.ExtensionContext) {
  const searchEngines = [
    new NodeHtmlParserAdaptor(),
    new JsxHtmlParserAdapter(),
  ];
  const previewProvider = new ReplacePreviewDocumentProvider(...searchEngines);
  const resultPanel = new SearchResultPanelProvider(previewProvider, ...searchEngines);
  previewProvider.init(context);
  resultPanel.init(context);
  new SearchQueryPanelProvider(context, resultPanel, previewProvider);
}

export function deactivate() {}
