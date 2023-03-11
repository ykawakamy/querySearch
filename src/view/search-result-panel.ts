import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
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
  replaceExpr!: string;
  queryExpr!: string;

  constructor(private context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView(Constants.VIEW_ID_SEARCHRESULT, {
      treeDataProvider: this,
      showCollapseAll: true,
    });

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
    this.result = [];
    this._onDidChangeTreeData.fire(undefined);
  }
  addResult(r: SerachResult) {
    this.result.push(r);
    this._onDidChangeTreeData.fire(undefined);
  }
  private _onDidChangeTreeData: vscode.EventEmitter<SerachResult | undefined> =
    new vscode.EventEmitter<SerachResult | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SerachResult | undefined> =
    this._onDidChangeTreeData.event;

  private result: SerachResult[] = [];



  private onActiveEditorChanged(): void {
		if (vscode.window.activeTextEditor) {
      this.refresh(vscode.window.activeTextEditor.document);
		} else {
    }

  }

  async onDocumentChanged(
    changeEvent: vscode.TextDocumentChangeEvent
  ) {
    const document = changeEvent.document;
    this.refresh(document);
  }

  async refresh(document :vscode.TextDocument){
    const uri = document.uri;
    if (!uri.path.endsWith(".html")) {
      return;
    }

    // when didn't searched
    if( !this.queryExpr ){
      return;
    }
    const r = await this.refreshResult(document, this.queryExpr, uri);
    if (r) {
      this.result.splice(this.result.findIndex(v=>v.resourceUri?.fsPath === uri.fsPath), 1, r);
      this._onDidChangeTreeData.fire(undefined);
    }

  }

  getChildren(offset?: SerachResult | SerachResultItem): Thenable<any[]> {
    if (offset && offset instanceof SerachResult) {
      return Promise.resolve(offset.items);
    }

    return Promise.resolve(this.result);
  }

  getTreeItem(offset: SerachResult): vscode.TreeItem {
    return offset;
  }

  select(range: vscode.Range) {}

  async traverse(queryExpr: string) {
    try{
      const compiledQuery = CSSselect.compile(queryExpr);
    }catch(e){
      vscode.window.showErrorMessage("invalid search expression.");
      return;
    }

    this.queryExpr = queryExpr;
    vscode.window.withProgress(
      { location: { viewId: Constants.VIEW_ID_SEARCHRESULT } },
      async (progress, token) => {
        progress.report({ increment: 0 });
        const workspaceFolder = (
          vscode.workspace.workspaceFolders ?? []
        ).filter((folder) => folder.uri.scheme === "file")[0].uri;
        const gitIgnore = fs.readFileSync(
          path.join(workspaceFolder.fsPath, ".gitignore"),
          "utf-8"
        );
        const gitIgnorePatterns = gitIgnore
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "")
          .map((line) => posix.join(workspaceFolder.path, line));

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
          if (!uri.path.endsWith(".html")) {
            return;
          }
          // const content$ = vscode.workspace.fs.readFile(uri);
          // const content = new TextDecoder().decode(await content$);
          const content$ = await vscode.workspace.openTextDocument(uri);
          const result = await self.refreshResult(content$, queryExpr, uri);
          if (result) {
            self.addResult(result);
          }
        }
      }
    );
  }

  async refreshResult(
    content$: vscode.TextDocument,
    queryExpr: string,
    uri: vscode.Uri
  ) {
    const content = content$.getText();
    const doc = HTMLParser.parse(content);

    const result = doc.querySelectorAll(queryExpr);
    if (result?.length > 0) {
      const r = new SerachResult(
        content$,
        result
      );
      return r;
    }
    return null;
  }

  async replace(item: SerachResultItem, replaceExpr : string) {
    const baseTag = item.tag;
    const $ = baseTag.clone();
    const context = { $: $ };
    vm.createContext(context);

    try {
      const result = vm.runInContext(replaceExpr, context, {
        timeout: 1000,
      });
      const uri = item.resourceUri!;
      const document = await vscode.workspace.openTextDocument(uri!);

      const range = new vscode.Range(
        document.positionAt(baseTag.range[0]),
        document.positionAt(baseTag.range[1])
      );

      const edit = new vscode.WorkspaceEdit();
      edit.replace(item.resourceUri!, range, $.parentNode.toString());

      await vscode.workspace.applyEdit(edit);
      const r = await this.refreshResult(document, this.queryExpr, uri);
      if (r) {
        this.result.splice(this.result.indexOf(item.parent), 1, r);
        this._onDidChangeTreeData.fire(undefined);
      }
    } catch (e: any) {
      vscode.window.showErrorMessage("failed to replace: \n"+ e.toString());
      console.log(e, e.stack);
    }
  }
}
