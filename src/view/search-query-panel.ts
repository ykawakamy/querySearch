import { posix } from "path";
import * as vscode from "vscode";
import { URI, Utils } from "vscode-uri";
import * as HTMLParser from "node-html-parser";
import { TextDecoder } from "util";
import { SearchResultPanelProvider } from "./search-result-panel";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { Constants } from "../constants";
import path = require("path");

export class SearchQueryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = Constants.VIEW_ID_QUERY;

  private _view?: vscode.WebviewView;
  private _extensionUri;
  private _target?: SerachResultItem | SerachResult;
  constructor(
    private context: vscode.ExtensionContext,
    private resultPanel: SearchResultPanelProvider
  ) {
    this._extensionUri = context.extensionUri;
    context.subscriptions.push(
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
        (resource, start, end) => this.openResource(resource, start, end)
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACE,
        (result: SerachResultItem) => {
          this._target = result;
          this._view?.webview
            .postMessage({ type: "prepare-replace" });
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEALL,
        (result: SerachResult) => {
          this._target = result;
          this._view?.webview
            .postMessage({ type: "prepare-replace-all" });
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEFILES,
        () => {
          this._view?.webview
            .postMessage({ type: "prepare-replace-files" });
        }
      )
    );
  }

  openResource(resource: vscode.Uri, start: any, end: any): any {
    vscode.workspace.openTextDocument(resource).then((document) => {
      const range = new vscode.Range(
        document.positionAt(start),
        document.positionAt(end)
      );
      vscode.window.showTextDocument(document, { selection: range });
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
          const queryExpr = data.queryExpr;
          console.log(queryExpr);
          this.resultPanel.searchWorkspace(queryExpr);
          break;
        }
        case "do-replace": {
          if (this._target instanceof SerachResultItem) {
            this.resultPanel.replace(this._target, data.replaceExpr);
            this._target = undefined;
          }
          break;
        }
        case "do-replace-all": {
          if (this._target instanceof SerachResult) {
            this.resultPanel.replaceAll(this._target, data.replaceExpr);
            this._target = undefined;
          }
          break;
        }
        case "do-replace-files": {
          this.resultPanel.replaceAllFiles(data.replaceExpr);
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

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Search Query</title>
			</head>
			<body>
        <textarea id="query-expr" rows="1">${this.resultPanel.queryExpr}</textarea>
				<button id="do-search">Search</button>
        <textarea id="replace-expr" rows="3" placeholder="experimental: ex) $.insertAdjacentHTML('afterend', $.removeChild($.querySelector('div')).outerHTML); $">${this.resultPanel.replaceExpr}</textarea>

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
