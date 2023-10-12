import * as fs from "fs/promises";
import ignore from "ignore";
import * as path from "path";
import { posix } from "path";
import * as vscode from "vscode";
import { Constants } from "../constants";
import {
  ReplaceDocument,
  ReplaceEdit,
  ReplaceEditTextDocument
} from "../engine/replace-edit";
import { SearchContext, SearchEngine } from "../engine/search-engine";
import { SerachResult, SerachResultItem } from "../model/search-result.model";

export class SearchResultPanelProvider
  implements vscode.TreeDataProvider<SerachResult>
{
  private _view?: vscode.TreeView<SerachResult | SerachResultItem>;

  queryContext!: SearchContext;

  private _context?: vscode.ExtensionContext;
  private _result: SerachResult[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<SerachResult | undefined> =
    new vscode.EventEmitter<SerachResult | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SerachResult | undefined> =
    this._onDidChangeTreeData.event;

  searchEngines: SearchEngine<any>[];
  constructor(...searchEngines: SearchEngine<any>[]) {
    this.searchEngines = searchEngines;
  }

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
    const searchEngine = this.searchEngines.find(v=>v.canApply(document.uri));
    if (!searchEngine) {
      return;
    }

    const index = this._result.findIndex(
      (v) =>
        v.resourceUri?.scheme === uri.scheme &&
        v.resourceUri?.fsPath === uri.fsPath
    );
    if (index === -1) {
      return;
    }

    const r = searchEngine.search(document, this.queryContext);
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
      // this.searchEngine.validateSearchContext(queryExpr);
    } catch (e) {
      console.log("invalid search expression.", e);
      vscode.window.showErrorMessage("invalid search expression.");
      return;
    }

    this.queryContext = queryExpr;
    vscode.window.withProgress(
      { location: { viewId: Constants.VIEW_ID_SEARCHRESULT } },
      async (progress, token) => {
        progress.report({
          message: "searching...",
        });

        this.clearResult();

        const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
        for (const workspaceFolder of workspaceFolders.filter(
          (folder) => folder.uri.scheme === "file"
        )) {
          const gitIgnorePatterns = await this.getIgnorePattern(
            workspaceFolder.uri
          );
          const filter = await this.filter(
            workspaceFolder,
            gitIgnorePatterns,
            queryExpr
          );
          await this.searchDirectory(filter, workspaceFolder.uri, queryExpr);
        }
        progress.report({ increment: 100 });
      }
    );
  }

  filter(
    workspaceFolder: vscode.WorkspaceFolder,
    gitIgnorePatterns: string[],
    queryExpr: SearchContext
  ) {
    const ig = ignore().add(gitIgnorePatterns);
    if (queryExpr.excludes) {
      ig.add(queryExpr.excludes!);
    }
    const includes = queryExpr.includes ? (t:string)=> ignore().add(queryExpr.includes!).test(t).ignored: (t : string)=>true;
    const filter = (filePath: string, isFolder: boolean) => {
      const relative = path.relative(workspaceFolder.uri.fsPath, filePath);

      if (ig.test(relative).ignored) {
        return false;
      }
      return isFolder || includes(relative);
    };
    return filter;
  }

  async searchDirectory(
    filter: (filePath: string, isFolder: boolean) => boolean,
    folder: vscode.Uri,
    queryExpr: SearchContext
  ) {
    for (const [name, type] of await vscode.workspace.fs.readDirectory(
      folder
    )) {
      const filePath = posix.join(folder.fsPath, name);
      // exclude .gitignore
      if (type === vscode.FileType.File) {
        if (!filter(filePath, false)) {
          continue;
        }
        await this.searchFile(folder.with({ path: filePath }), queryExpr);
      } else if (type === vscode.FileType.Directory) {
        if (!filter(filePath, true)) {
          continue;
        }
        await this.searchDirectory(filter, folder.with({ path: filePath }), queryExpr);
      }
    }
  }

  async searchFile(uri: vscode.Uri, queryExpr: SearchContext) {
    const searchEngine = this.searchEngines.find(v=>v.canApply(uri));
    if (!searchEngine) {
      return;
    }
    const content$ = await vscode.workspace.openTextDocument(uri);
    const result = searchEngine.search(content$, queryExpr);
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
      .filter((line) => line !== "" && !line.startsWith("#"));
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

    const searchEngine = this.searchEngines.find((v=>v.canApply(searchResult.resourceUri)));
    if(searchEngine){
      await searchEngine.replace(searchResult, replaceExpr, edit);
      await this._refresh(searchResults, edit);
    }
  }

  async replaceAllFiles(replaceExpr: string) {
    const edit = new ReplaceEditTextDocument();
    const searchResults = this._result;

    for( const searchResult of searchResults){
      const searchEngine = this.searchEngines.find((v=>v.canApply(searchResult.resourceUri)));
      if(searchEngine){
        await searchEngine.replace(searchResult, replaceExpr, edit);
      }
    }
    await this._refresh(searchResults, edit);
  }

  private async _refresh(searchResults: SerachResult[], edit: ReplaceEdit) {
    for (const searchResult of searchResults) {
      const uri = searchResult.resourceUri!;
      const document = await edit.modifiedTextDocument(uri!);
      await this.refresh(document);
    }
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
