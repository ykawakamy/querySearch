import * as vscode from "vscode";
import { Constants, State } from "../constants";
import { SearchContext } from "../model/search-context.model";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { SearchResultPanelProvider } from "./search-result-panel";
import path = require("path");
import {
  ReplacePreviewDocumentProvider,
  getPreviewUri,
} from "./replace-preview";

export class SearchQueryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = Constants.VIEW_ID_QUERY;

  private _view?: vscode.WebviewView;
  private _extensionUri;
  private _target?: SerachResultItem | SerachResult;
  _searchContext!: SearchContext;
  set searchContext(v: SearchContext) {
    this._searchContext = v;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._context?.workspaceState.update(State.latestQuery, this.searchContext);
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

    this._searchContext = _context.workspaceState.get(State.latestQuery, {
      search: "",
    });

    _context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SearchQueryPanelProvider.viewId,
        this,
        {
          webviewOptions: {
            // retainContextWhenHidden: true,
          },
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_OPENFILE,
        (item: SerachResultItem) => this.openResource(item)
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
        (item: SerachResultItem) =>
          this.searchContext.replaceToggle
            ? this.openReplacePreview(item)
            : this.openResource(item)
      ),
    );
  }

  openResource(item: SerachResultItem) {
    const document = item.document;
    const range = new vscode.Range(
      document.positionAt(item.startOffset),
      document.positionAt(item.endOffset)
    );
    void vscode.window.showTextDocument(document, { selection: range });
  }

  openReplacePreview(item: SerachResultItem) {
    const searchContext = this.searchContext;
    void this.previewProvider.openReplacePreview(item, searchContext);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      context.state
    );

    webviewView.webview.onDidReceiveMessage((data: any) => {
      switch (data.type) {
        case "do-search": {
          this.searchContext = {
            ...this.searchContext,
            search: data.searchContext,
            includes: data.filterIncludes,
            excludes: data.filterExcludes,
          };

          void this.resultPanel.searchWorkspace(this.searchContext);
          break;
        }
        case "change-replace": {
          this.searchContext = {
            ...this.searchContext,
            replace: data.replaceExpr,
          };

          break;
        }
        case "query-replace-toggle": {
          this.searchContext = {
            ...this.searchContext,
            replaceToggle: data.hidden,
          };
          break;
        }
        case "filter-toggle": {
          this.searchContext = {
            ...this.searchContext,
            filterToggle: data.hidden,
          };
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, state: any) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
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
    const filesToInclude = "files to include";
    const filesToExclude = "files to exclude";

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<link href="${codiconsUri}" rel="stylesheet">
				<title>Search Query</title>
			</head>
			<body>
        <div class="query-widget">
          <a class="query-replace-toggle" id="query-replace-toggle">
            <div id="query-replace-toggle-off" class="icon"><i class="codicon codicon-chevron-right"></i></div>
            <div id="query-replace-toggle-on" class="icon"><i class="codicon codicon-chevron-down"></i></div>
          </a>
          <div class="query-container container"> 
            <textarea id="query-expr" rows="1"></textarea>
            <button id="do-search">Search</button>
            <textarea id="replace-expr" rows="3" 
            placeholder="experimental: ex) $.insertAdjacentHTML('afterend', $.removeChild($.querySelector('div')).outerHTML); $"
            ></textarea>
          </div>
        </div>
        <a class="filter-toggle" id="filter-toggle">
          <div class="icon"><i class="codicon codicon-kebab-horizontal"></i></div>
        </a>
        <div class="filter-container container" id="filter-container">
          <label>${filesToInclude}</label>
          <input id="filter-includes">
          <label>${filesToExclude}</label>
          <input id="filter-excludes">
        </div>
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
