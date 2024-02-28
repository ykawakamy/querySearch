import * as vscode from "vscode";
import { Constants, State } from "../constants";
import {
  SearchContext,
  defaultSearchContext,
} from "../model/search-context.model";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { ReplacePreviewDocumentProvider } from "./replace-preview";
import { SearchResultPanelProvider } from "./search-result-panel";
import path = require("path");
import { WebViewEvent } from "../model/webview-event";
import { SearchQueryPanelState } from "../model/search-query-panel-state";

export class SearchQueryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = Constants.VIEW_ID_QUERY;

  private _extensionUri;
  private _searchContext!: SearchContext;

  set searchContext(v: SearchContext) {
    this._searchContext = v;
    void this._context?.workspaceState.update(
      State.latestQuery,
      this.searchContext
    );
  }
  get searchContext(): SearchContext {
    return this._searchContext;
  }

  constructor(
    private _context: vscode.ExtensionContext,
    private resultPanel: SearchResultPanelProvider,
    private previewProvider: ReplacePreviewDocumentProvider
  ) {
    this._extensionUri = _context.extensionUri;

    this.searchContext = _context.workspaceState.get(
      State.latestQuery,
      defaultSearchContext
    );

    _context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SearchQueryPanelProvider.viewId,
        this
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_OPENFILE,
        (item: SerachResult | SerachResultItem) => this.openResource(item)
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
        (item: SerachResult | SerachResultItem) =>
          this.searchContext.replaceToggle
            ? this.openReplacePreview(item)
            : this.openResource(item)
      )
    );
  }

  openResource(item: SerachResult | SerachResultItem) {
    const document = item.document;
    if (item instanceof SerachResult) {
      void vscode.window.showTextDocument(document);
    } else {
      const range = new vscode.Range(
        document.positionAt(item.startOffset),
        document.positionAt(item.endOffset)
      );
      void vscode.window.showTextDocument(document, { selection: range });
    }
  }

  openReplacePreview(item: SerachResult | SerachResultItem) {
    const searchContext = this.searchContext;
    void this.previewProvider.openReplacePreview(item, searchContext);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<SearchQueryPanelState>,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      context.state
    );

    webviewView.webview.onDidReceiveMessage(async (data: WebViewEvent) => {
      switch (data.type) {
        case "do-search": {
          this.searchContext = {
            ...data,
          };
          await vscode.commands.executeCommand("setContext", Constants.SET_CONTEXT_REPLACE_MODE, this.searchContext.replaceToggle );
          void this.resultPanel.searchWorkspace(this.searchContext);
          break;
        }
        case "patch-search-context": {
          this.searchContext = {
            ...this.searchContext,
            ...data,
          };
          await vscode.commands.executeCommand("setContext", Constants.SET_CONTEXT_REPLACE_MODE, this.searchContext.replaceToggle );
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    state?: SearchQueryPanelState
  ) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webview-ui",
        "build",
        "assets",
        "index.js"
      )
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "webview-ui",
        "build",
        "assets",
        "index.css"
      )
    );
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css"
      )
    );
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    const bundleUrl = webview.asWebviewUri(vscode.l10n.uri!);

    return /*html*/ `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <link href="${codiconsUri}" rel="stylesheet">
        <title>Search Query</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}">
          const bundleUri="${bundleUrl}";
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
