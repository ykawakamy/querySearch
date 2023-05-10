import { posix } from "path";
import * as vscode from "vscode";
import { URI, Utils } from "vscode-uri";
import * as HTMLParser from "node-html-parser";
import { TextDecoder } from "util";
import { SearchResultPanelProvider } from "./search-result-panel";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { Constants } from "../constants";
import path = require("path");
import { SearchContext } from "../engine/search-engine";

export class SearchQueryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = Constants.VIEW_ID_QUERY;

  private _view?: vscode.WebviewView;
  private _extensionUri;
  private _target?: SerachResultItem | SerachResult;

  queryExpr: string = "";
  replaceExpr: string = "";

  constructor(
    private _context: vscode.ExtensionContext,
    private resultPanel: SearchResultPanelProvider
  ) {
    this._extensionUri = _context.extensionUri;

    this.queryExpr = _context.workspaceState.get(
      Constants.STATE.LATEST_QUERY,
      ""
    );
    this.replaceExpr = _context.workspaceState.get(
      Constants.STATE.LATEST_REPLACE_EXPRESSION,
      ""
    );

    _context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SearchQueryPanelProvider.viewId,
        this,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_OPENFILE,
        (resource, start, end) => this.openReplacePreview(resource, start, end)
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACE,
        (result: SerachResultItem) => {
          this._target = result;
          this._view?.webview.postMessage({ type: "prepare-replace" });
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEALL,
        (result: SerachResult) => {
          this._target = result;
          this._view?.webview.postMessage({ type: "prepare-replace-all" });
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEFILES,
        () => {
          this._view?.webview.postMessage({ type: "prepare-replace-files" });
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_COPY_RESULT,
        async () => {
          vscode.env.clipboard.writeText(
            await this.resultPanel.getResultText()
          );
        }
      )
    );
  }

  openResource(resource: vscode.Uri, start: any, end: any) {
    vscode.workspace.openTextDocument(resource).then((document) => {
      const range = new vscode.Range(
        document.positionAt(start),
        document.positionAt(end)
      );
      vscode.window.showTextDocument(document, { selection: range });
    });
  }

  openReplacePreview(resource: vscode.Uri, start: any, end: any) {
    const preview = vscode.Uri.from({
      scheme: Constants.SCHEMA_PREVIEW,
      path: resource.path,
      fragment: resource.scheme,
      query: JSON.stringify({
        search: this.queryExpr,
        replace: this.replaceExpr,
      }),
    });
    vscode.workspace.openTextDocument(resource).then((document) => {
      const range = new vscode.Range(
        document.positionAt(start),
        document.positionAt(end)
      );
      const options: vscode.TextDocumentShowOptions = {
        selection: range,
        preserveFocus: true,
        preview: true,
      };
      vscode.commands.executeCommand(
        "vscode.diff",
        resource,
        preview,
        `repalce preview`,
        options
      );
    });
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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((data: any) => {
      switch (data.type) {
        case "do-search": {
          this.queryExpr = data.queryExpr;
          this._context?.workspaceState.update(
            Constants.STATE.LATEST_QUERY,
            this.queryExpr
          );
          this.resultPanel.searchWorkspace({ search: this.queryExpr });
          break;
        }
        case "do-replace": {
          if (this._target instanceof SerachResultItem) {
            this.replaceExpr = data.replaceExpr;
            this.resultPanel.replace(this._target, data.replaceExpr);
            this._target = undefined;
          }
          break;
        }
        case "do-replace-all": {
          if (this._target instanceof SerachResult) {
            this.replaceExpr = data.replaceExpr;
            this.resultPanel.replaceAll(this._target, data.replaceExpr);
            this._target = undefined;
          }
          break;
        }
        case "do-replace-files": {
          this.replaceExpr = data.replaceExpr;
          this.resultPanel.replaceAllFiles(data.replaceExpr);
          break;
        }
        case "change-replace": {
          this.replaceExpr = data.replaceExpr;
          this._context?.workspaceState.update(
            Constants.STATE.LATEST_REPLACE_EXPRESSION,
            this.replaceExpr
          );
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
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
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
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
          <div class="query-replace-toggle">
            <div class="icon"><i class="codicon codicon-chevron-right"></i></div>
          </div>
          <form class="query-container"> 
            <div class="inputbox">
              <textarea id="query-expr" rows="1">${this.queryExpr}</textarea>
            </div>
            <button id="do-search">Search</button>
            <div class="inputbox">
              <textarea id="replace-expr" rows="3" 
              placeholder="experimental: ex) $.insertAdjacentHTML('afterend', $.removeChild($.querySelector('div')).outerHTML); $"
              >${this.replaceExpr}</textarea>
            </div>
          </form>
        </div>
        <div class="filter-container">
          <label>${filesToInclude}</label>
          <div class="inputbox">
            <input id="filterInclude">
          </div>
          <label>${filesToExclude}</label>
          <div class="inputbox">
            <input id="filterExclude">
          </div>
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
