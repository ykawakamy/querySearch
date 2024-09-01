import * as vscode from "vscode";
import { SearchQueryPanelProvider } from "./view/search-query-panel";
import { SearchResultPanelProvider } from "./view/search-result-panel";
import { ReplacePreviewDocumentProvider } from "./view/replace-preview";
import { NodeHtmlParserAdaptor } from "./engine/node-html-parser";
import { JsxHtmlParserAdapter } from "./engine/jsx-htmlnode-parser";
import { TreeviewOnWebviewProvider } from "treeview-on-vscode-webview/dist/TreeviewOnWebviewProvider";
import { Constants } from "./constants";
import { SearchResult, SearchResultItem } from "./model/search-result.model";

export function activate(context: vscode.ExtensionContext) {
  const searchEngines = [
    new NodeHtmlParserAdaptor(),
    new JsxHtmlParserAdapter(),
  ];
  const previewProvider = new ReplacePreviewDocumentProvider(...searchEngines);
  const resultPanel = new SearchResultPanelProvider(previewProvider, ...searchEngines);
  const treeProvider = new TreeviewOnWebviewProvider(context, resultPanel, Constants.VIEW_ID_SEARCHRESULT, { isUseVscodeOpenTextDocument: true });
  previewProvider.init(context);
  resultPanel.init(context);
  const queryPanel = new SearchQueryPanelProvider(context, resultPanel, treeProvider, previewProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      Constants.COMMAND_QUERYSEARCH_REPLACE,
      async (result: SearchResultItem) => {
        if (!result.isCompleted) {
          result.isCompleted = true;
          await resultPanel.replace(result);
        }
      }
    ),
    vscode.commands.registerCommand(
      Constants.COMMAND_QUERYSEARCH_REPLACEALL,
      async (result: SearchResult) => {
        await resultPanel.replaceAll(result);
      }
    ),
    vscode.commands.registerCommand(
      Constants.COMMAND_QUERYSEARCH_REPLACEFILES,
      async () => {
        await resultPanel.replaceAllFiles();
      }
    ),
    treeProvider.registerCommand(
      Constants.COMMAND_QUERYSEARCH_COPY_RESULT,
      async () => {
        await vscode.env.clipboard.writeText(await resultPanel.getResultText());
      }
    ),
    vscode.commands.registerCommand(
      Constants.COMMAND_QUERYSEARCH_OPENFILE,
      (item: SearchResult | SearchResultItem) => queryPanel.openResource(item)
    ),
    vscode.commands.registerCommand(
      Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
      (item: SearchResult | SearchResultItem) =>
        queryPanel.searchContext.replaceContext.replaceToggle
          ? queryPanel.openReplacePreview(item)
          : queryPanel.openResource(item)
    )
  );

  context.subscriptions.push(
    treeProvider.onDidCollapseElement((e) => {
      e.element.isExpanded = false;
    }),
    treeProvider.onDidExpandElement((e) => {
      e.element.isExpanded = true;
    })
  );
}

export function deactivate() { }
