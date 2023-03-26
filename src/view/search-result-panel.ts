import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { Constants } from "../constants";
import { posix } from "path";
import { URI, Utils } from "vscode-uri";
import * as HTMLParser from "node-html-parser";
import * as CSSselect from "css-select";
import * as vm from "vm";
import minimatch from "minimatch";

export class SearchResultPanelProvider
  implements vscode.TreeDataProvider<SerachResult>
{
  _replaceExpr: string = "";
  _queryExpr: string = "";

  get replaceExpr() {
    return this._replaceExpr;
  }

  set replaceExpr(replaceExpr) {
    this._replaceExpr = replaceExpr;
    this._context?.workspaceState.update(
      Constants.STATE.LATEST_REPLACE_EXPRESSION,
      replaceExpr
    );
  }

  get queryExpr() {
    return this._queryExpr;
  }

  set queryExpr(queryExpr) {
    this._queryExpr = queryExpr;
    this._context?.workspaceState.update(
      Constants.STATE.LATEST_QUERY,
      queryExpr
    );
  }
  private _context?: vscode.ExtensionContext;
  private _result: SerachResult[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<SerachResult | undefined> =
    new vscode.EventEmitter<SerachResult | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SerachResult | undefined> =
    this._onDidChangeTreeData.event;

  constructor() {}

  init(context: vscode.ExtensionContext) {
    this._context = context;

    const view = vscode.window.createTreeView(Constants.VIEW_ID_SEARCHRESULT, {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    this.queryExpr = context.workspaceState.get(
      Constants.STATE.LATEST_QUERY,
      ""
    );
    this.replaceExpr = context.workspaceState.get(
      Constants.STATE.LATEST_REPLACE_EXPRESSION,
      ""
    );

    context.subscriptions.push(view);

    vscode.window.onDidChangeActiveTextEditor(() =>
      this.onActiveEditorChanged()
    );
    vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));
    this.onActiveEditorChanged();
  }

  setReplaceExpr(replaceExpr: any) {
    this.replaceExpr = replaceExpr;
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

  async onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent) {
    const document = changeEvent.document;
    this.refresh(document);
  }

  async refresh(document: vscode.TextDocument) {
    const uri = document.uri;
    if (!this.isTargetFile(uri)) {
      return;
    }

    // when didn't searched
    if (!this.queryExpr) {
      return;
    }
    const index = this._result.findIndex(
      (v) => v.resourceUri?.fsPath === uri.fsPath
    );
    if (index === -1) {
      return;
    }

    const r = await this.refreshResult(document, this.queryExpr);
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

  async searchWorkspace(queryExpr: string) {
    try {
      const compiledQuery = CSSselect.compile(queryExpr);
    } catch (e) {
      vscode.window.showErrorMessage("invalid search expression.");
      return;
    }

    const workspaceFolder = (vscode.workspace.workspaceFolders ?? []).filter(
      (folder) => folder.uri.scheme === "file"
    )[0].uri;
    const gitIgnorePatterns = await this.getIgnorePattern(workspaceFolder);

    this.queryExpr = queryExpr;

    vscode.window.withProgress(
      { location: { viewId: Constants.VIEW_ID_SEARCHRESULT } },
      async (progress, token) => {
        progress.report({ increment: 0 });

        this.clearResult();
        await search(this, workspaceFolder);
        progress.report({ increment: 100 });

        async function search(
          self: SearchResultPanelProvider,
          folder: vscode.Uri
        ) {
          for (const [name, type] of await vscode.workspace.fs.readDirectory(
            folder
          )) {
            const filePath = posix.join(folder.path, name);
            // exclude .gitignore
            if (
              gitIgnorePatterns.some((pattern) => minimatch(filePath, pattern))
            ) {
              continue;
            }
            if (type === vscode.FileType.File) {
              await searchFile(self, folder.with({ path: filePath }));
            } else if (type === vscode.FileType.Directory) {
              await search(self, folder.with({ path: filePath }));
            }
          }
        }

        async function searchFile(
          self: SearchResultPanelProvider,
          uri: vscode.Uri
        ) {
          if (!self.isTargetFile(uri)) {
            return;
          }
          const content$ = await vscode.workspace.openTextDocument(uri);
          const result = await self.refreshResult(content$, queryExpr);
          if (result) {
            self.addResult(result);
          }
        }
      }
    );
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

  async refreshResult(content$: vscode.TextDocument, queryExpr: string) {
    const content = content$.getText();
    const doc = HTMLParser.parse(content, {
      comment: true,
      voidTag: { closingSlash: false },
    });

    const result = doc.querySelectorAll(queryExpr);
    if (result?.length > 0) {
      const r = new SerachResult(content$, result);
      return r;
    }
    return null;
  }

  async replace(item: SerachResultItem, replaceExpr: string) {
    this.replaceExpr = replaceExpr;
    const edit = new vscode.WorkspaceEdit();

    try {
      const uri = item.resourceUri!;
      const document = await vscode.workspace.openTextDocument(uri!);
      this._replace(item, document, replaceExpr, edit);

      await vscode.workspace.applyEdit(edit);
      await this.refresh(document);
    } catch (e: any) {
      vscode.window.showErrorMessage("failed to replace: \n" + e?.toString());
      console.log(e, e.stack);
    }
  }

  async replaceAll(searchResult: SerachResult, replaceExpr: string) {
    this.replaceExpr = replaceExpr;
    const edit = new vscode.WorkspaceEdit();

    try {
      const uri = searchResult.resourceUri!;
      const document = await vscode.workspace.openTextDocument(uri!);
      for (const item of searchResult.items) {
        this._replace(item, document, replaceExpr, edit);
      }

      await vscode.workspace.applyEdit(edit);
      await this.refresh(document);
    } catch (e: any) {
      vscode.window.showErrorMessage("failed to replace: \n" + e?.toString());
      console.log(e, e.stack);
    }
  }

  async replaceAllFiles(replaceExpr: string) {
    this.replaceExpr = replaceExpr;
    const edit = new vscode.WorkspaceEdit();

    try {
      for (const searchResult of this._result) {
        const uri = searchResult.resourceUri!;
        const document = await vscode.workspace.openTextDocument(uri!);
        for (const item of searchResult.items) {
          this._replace(item, document, replaceExpr, edit);
        }
      }

      await vscode.workspace.applyEdit(edit);

      for (const searchResult of this._result) {
        const uri = searchResult.resourceUri!;
        const document = await vscode.workspace.openTextDocument(uri!);
        await this.refresh(document);
      }
    } catch (e: any) {
      vscode.window.showErrorMessage("failed to replace: \n" + e?.toString());
      console.log(e, e.stack);
    }
  }

  private _replace(
    item: SerachResultItem,
    document: vscode.TextDocument,
    replaceExpr: string,
    edit: vscode.WorkspaceEdit
  ) {
    const baseTag = item.tag;
    const range = new vscode.Range(
      document.positionAt(baseTag.range[0]),
      document.positionAt(baseTag.range[1])
    );

    const $ = baseTag.clone();
    const vmContext = { $: $ };
    vm.createContext(vmContext);
    const result = vm.runInContext(replaceExpr, vmContext, {
      timeout: 1000,
    });

    edit.replace(document.uri, range, $.parentNode?.toString());
  }
}
