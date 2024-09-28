import * as vscode from "vscode";
import { Constants, State } from "../constants";
import {
  SearchContext,
  defaultSearchContext,
} from "../model/search-context.model";
import { SearchResult, SearchResultItem } from "../model/search-result.model";
import { ReplacePreviewDocumentProvider } from "./replace-preview";
import { SearchResultPanelProvider } from "./search-result-panel";
import path = require("path");
import { WebViewEvent } from "../model/webview-event";
import { SearchQueryPanelState } from "../model/search-query-panel-state";
import { TreeviewOnWebviewProvider } from "treeview-on-vscode-webview/dist/TreeviewOnWebviewProvider";
import { IconThemeForWebview, loadIconTheme } from "treeview-on-vscode-webview/dist/ContributesUtil";
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
    private treeviewProvider: TreeviewOnWebviewProvider<object>,
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
    );
  }

  async openResource(item: SearchResult | SearchResultItem) {
    const uri = item.resourceUri;
    if (item instanceof SearchResult) {
      void vscode.window.showTextDocument(uri, { preserveFocus: true });
    } else {
      const document = await vscode.workspace.openTextDocument(uri);
      void vscode.window.showTextDocument(uri, { preserveFocus: true, selection: item.getRange(document) });
    }
  }

  openReplacePreview(item: SearchResult | SearchResultItem) {
    const searchContext = this.searchContext;
    void this.previewProvider.openReplacePreview(item, searchContext);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<SearchQueryPanelState>,
    _token: vscode.CancellationToken
  ) {
    const iconThemeId = vscode.workspace.getConfiguration("workbench").get<string>("iconTheme");
    const exts = vscode.extensions.all;
    const iconTheme = await loadIconTheme(webviewView, exts, iconThemeId);
    if (!iconTheme) {
      throw new Error("failed to loadIconTheme.");
    }
    await this.treeviewProvider.attactWebview(webviewView);
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri, iconTheme.uri],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      context.state,
      iconTheme
    );

    webviewView.webview.onDidReceiveMessage(async (data: WebViewEvent) => {
      switch (data.type) {
        case "do-search": {
          this.searchContext = {
            ...data,
          };
          await this.treeviewProvider.setContext(
            Constants.SET_CONTEXT_REPLACE_MODE,
            this.searchContext.replaceContext.replaceToggle
          );
          void this.resultPanel.searchWorkspace(this.searchContext, webviewView.webview);
          break;
        }
        case "patch-search-context": {
          this.searchContext.replaceContext = {
            ...this.searchContext.replaceContext,
            ...data,
          };
          await this.treeviewProvider.setContext(
            Constants.SET_CONTEXT_REPLACE_MODE,
            this.searchContext.replaceContext.replaceToggle
          );
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(
    webview: vscode.Webview, state: SearchQueryPanelState | undefined, iconTheme: IconThemeForWebview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js")
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.css")
    );
    const treeviewCssUri = webview.asWebviewUri(
      // TODO: vsce package is not support symlink. see https://github.com/microsoft/vscode-vsce/issues/308
      vscode.Uri.joinPath(this._extensionUri, "dist", "vscc-treeview.css")
      // vscode.Uri.joinPath(this._extensionUri, "node_modules", "treeview-on-vscode-webview", "src", "webview", "vscc-treeview.css")
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

    const bundleUrl = !!vscode.l10n.uri ? webview.asWebviewUri(vscode.l10n.uri) : "";

    return /*html*/ `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="csp-nonce" content="${nonce}">
        <link href="${styleMainUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${codiconsUri}" rel="stylesheet">
        <link href="${treeviewCssUri}" rel="stylesheet">
        <style nonce="${nonce}">${iconTheme.styleContent.content}</style>
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
