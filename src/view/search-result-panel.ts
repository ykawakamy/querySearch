import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { Constants } from "../constants";
import { posix } from "path";
import { URI, Utils } from "vscode-uri";
import * as HTMLParser from "node-html-parser";

import * as vm from "vm";
import minimatch from "minimatch";
import { setTimeout } from "timers/promises";
import {
  ReplaceDocument,
  ReplaceEdit,
  ReplaceEditInMemory,
  ReplaceEditTextDocument,
} from "../engine/replace-edit";
import { SearchContext, SearchEngine} from "../engine/search-engine";

export class SearchResultPanelProvider
  implements vscode.TreeDataProvider<SerachResult>
{
  private _replaceExpr: string = "";
  private _queryExpr: string = "";
  private _view?: vscode.TreeView<SerachResult | SerachResultItem>;

  queryContext!: SearchContext;

  private _context?: vscode.ExtensionContext;
  private _result: SerachResult[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<SerachResult | undefined> =
    new vscode.EventEmitter<SerachResult | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SerachResult | undefined> =
    this._onDidChangeTreeData.event;

  constructor(public searchEngine: SearchEngine) {}

  init(context: vscode.ExtensionContext) {
    this._context = context;

    const view = vscode.window.createTreeView(Constants.VIEW_ID_SEARCHRESULT, {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
    });
    this._view = view;

    context.subscriptions.push(view);

    vscode.window.onDidChangeActiveTextEditor(() =>
      this.onActiveEditorChanged()
    );
    vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));
    this.onActiveEditorChanged();
  }

  clearResult() {
    this._result = [];
    this._onDidChangeTreeData.fire(undefined);
  }
  addResult(r: SerachResult) {
    this._result.push(r);
    this._onDidChangeTreeData.fire(undefined);
  }

  private onActiveEditorChanged(): void {
    if (vscode.window.activeTextEditor) {
      this.refresh(vscode.window.activeTextEditor.document);
    } else {
    }
  }

  onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent) {
    const document = changeEvent.document;
    this.refresh(document);
  }

  async refresh(document: ReplaceDocument) {
    const uri = document.uri;
    if (!this.isTargetFile(uri)) {
      return;
    }

    const index = this._result.findIndex(
      (v) => 
        v.resourceUri?.scheme === uri.fsPath
        && v.resourceUri?.fsPath === uri.fsPath
    );
    if (index === -1) {
      return;
    }

    const r = await this.searchEngine.search(document, this.queryContext);
    if (r) {
      this._result.splice(index, 1, r);
      this._onDidChangeTreeData.fire(undefined);
    } else {
      this._result.splice(index, 1);
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  private isTargetFile(uri: vscode.Uri) {
    return uri.path.endsWith(".html") || uri.path.endsWith(".htm");
  }

  getChildren(offset?: SerachResult | SerachResultItem): Thenable<any[]> {
    if (offset && offset instanceof SerachResult) {
      return Promise.resolve(offset.items);
    }

    return Promise.resolve(this._result);
  }

  getTreeItem(offset: SerachResult): vscode.TreeItem {
    return offset;
  }

  async searchWorkspace(queryExpr: SearchContext) {
    try {
      this.searchEngine.validateSearchContext(queryExpr);
    } catch (e) {
      console.log("invalid search expression.", e);
      vscode.window.showErrorMessage("invalid search expression.");
      return;
    }

    const workspaceFolder = (vscode.workspace.workspaceFolders ?? []).filter(
      (folder) => folder.uri.scheme === "file"
    )[0].uri;
    const gitIgnorePatterns = await this.getIgnorePattern(workspaceFolder);

    this.queryContext = queryExpr;

    vscode.window.withProgress(
      { location: { viewId: Constants.VIEW_ID_SEARCHRESULT } },
      async (progress, token) => {
        progress.report({
          message: "searching...",
        });

        this.clearResult();
        await this.search(gitIgnorePatterns, workspaceFolder, queryExpr);
        progress.report({ increment: 100 });
      }
    );
  }

  async search(
    gitIgnorePatterns: string[],
    folder: vscode.Uri,
    queryExpr: SearchContext
  ) {
    for (const [name, type] of await vscode.workspace.fs.readDirectory(
      folder
    )) {
      const filePath = posix.join(folder.path, name);
      // exclude .gitignore
      if (gitIgnorePatterns.some((pattern) => minimatch(filePath, pattern))) {
        continue;
      }
      if (type === vscode.FileType.File) {
        await this.searchFile(folder.with({ path: filePath }), queryExpr);
      } else if (type === vscode.FileType.Directory) {
        await this.search(
          gitIgnorePatterns,
          folder.with({ path: filePath }),
          queryExpr
        );
      }
    }
  }

  async searchFile(uri: vscode.Uri, queryExpr: SearchContext) {
    if (!this.isTargetFile(uri)) {
      return;
    }
    const content$ = await vscode.workspace.openTextDocument(uri);
    const result = await this.searchEngine.search(content$, queryExpr);
    if (result) {
      this.addResult(result);
    }
  }
  private async getIgnorePattern(workspaceFolder: vscode.Uri) {
    const gitIgnore = fs
      .readFile(path.join(workspaceFolder.fsPath, ".gitignore"), "utf-8")
      .catch((v) => "");
    const gitIgnorePatterns = (await gitIgnore)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => posix.join(workspaceFolder.path, line));
    return gitIgnorePatterns;
  }

  async replace(item: SerachResultItem, replaceExpr: string) {
    const searchResult = new SerachResult(item.resourceUri);
    searchResult.items = [item];

    await this.replaceAll(searchResult, replaceExpr);
  }

  async replaceAll(searchResult: SerachResult, replaceExpr: string) {
    const edit = new ReplaceEditTextDocument();
    const searchResults = [searchResult];

    await this.searchEngine.replace(searchResults, replaceExpr, edit);
    await this._refresh(searchResults, edit);
  }

  async replaceAllFiles(replaceExpr: string) {
    const edit = new ReplaceEditTextDocument();
    const searchResults = this._result;

    await this.searchEngine.replace(searchResults, replaceExpr, edit);
    await this._refresh(searchResults, edit);
  }

  private async _refresh(searchResults: SerachResult[], edit: ReplaceEdit) {
    for (const searchResult of searchResults) {
      const uri = searchResult.resourceUri!;
      const document = await edit.modifiedTextDocument(uri!);
      await this.refresh(document);
    }
  }

  private async _replaceItem(
    item: SerachResultItem,
    document: ReplaceDocument,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const baseTag = item.tag;

    const $ = baseTag.clone();
    const vmContext = { $: $ };
    vm.createContext(vmContext);
    const result = vm.runInContext(replaceExpr, vmContext, {
      timeout: 1000,
    });

    await edit.replace(
      document.uri,
      baseTag.range,
      this.searchEngine.getReplacedText($)
    );
  }

  async getResultText() {
    const selection = this._result;

    let result = selection
      .map((v) => {
        return (
          v.resourceUri?.toString() +
          "\n" +
          v.items.map((v) => `- ${v.startOffset}: ${v.label}`).join("\n")
        );
      })
      .join("\n");

    return result;
  }
}
