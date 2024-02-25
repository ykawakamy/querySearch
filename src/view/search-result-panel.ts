import * as fs from "fs/promises";
import ignore from "ignore";
import * as path from "path";
import { posix } from "path";
import * as vscode from "vscode";
import { Constants, ExecuteModes } from "../constants";
import {
  ReplaceEditTextDocument,
} from "../engine/replace-edit";
import { SearchContext } from "../model/search-context.model";
import { SearchEngine } from "../engine/search-engine";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import { t } from "@vscode/l10n";
import { ReplacePreviewDocumentProvider } from "./replace-preview";

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

  searchEngines: SearchEngine[];
  constructor(
    private previewProvider: ReplacePreviewDocumentProvider,
    ...searchEngines: SearchEngine[]
    ) {
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

    context.subscriptions.push(
      view,
      vscode.window.onDidChangeActiveTextEditor(() =>
        this.onActiveEditorChanged()
      ),
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e))
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACE,
        async (result: SerachResultItem) => {
          if(!result.isCompleted){
            result.isCompleted = true;
            await this.replace(result);
          }
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEALL,
        async (result: SerachResult) => {
          await this.replaceAll(result);
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_REPLACEFILES,
        async () => {
          await this.replaceAllFiles(this._result);
        }
      ),
      vscode.commands.registerCommand(
        Constants.COMMAND_QUERYSEARCH_COPY_RESULT,
        async () => {
          await vscode.env.clipboard.writeText(
            await this.getResultText()
          );
        }
      )
    );
  }

  clearResult() {
    this._result = [];
    this._onDidChangeTreeData.fire(undefined);
  }
  addResult(r: SerachResult) {
    this._result.push(r);
    this._onDidChangeTreeData.fire(undefined);
  }

  private async onActiveEditorChanged(): Promise<void> {
    if (vscode.window.activeTextEditor) {
      await this.refresh(vscode.window.activeTextEditor.document);
    }
  }

  private async onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent) {
    const document = changeEvent.document;
    await this.refresh(document);
  }

  async refresh(document: vscode.TextDocument) {
    const uri = document.uri;
    const searchEngine = this.searchEngines.find((v) =>
      v.canApply(document.uri)
    );
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

  getChildren(offset?: SerachResult | SerachResultItem): Thenable<any[]> {
    if (offset && offset instanceof SerachResult) {
      return Promise.resolve(offset.items);
    }

    return Promise.resolve(this._result);
  }

  getTreeItem(offset: SerachResult): vscode.TreeItem {
    return offset;
  }

  async searchWorkspace(searchContext: SearchContext) {
    try {
      for( const searchEngine of this.searchEngines){
        searchEngine.validateSearchContext(searchContext);
      }
    } catch (e) {
      await vscode.window.showErrorMessage(vscode.l10n.t("invalid search expression."));
      return;
    }

    this.queryContext = searchContext;
    await vscode.window.withProgress(
      { 
        location: { viewId: Constants.VIEW_ID_SEARCHRESULT },
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({
          message: vscode.l10n.t("searching..."),
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
            searchContext
          );
          await this.searchDirectory(filter, workspaceFolder.uri, searchContext, token);
        }
        progress.report({ increment: 100 });
      }
    );
  }

  filter(
    workspaceFolder: vscode.WorkspaceFolder,
    gitIgnorePatterns: string[],
    searchContext: SearchContext
  ) {
    const ig = ignore().add(gitIgnorePatterns);
    const isEnable = searchContext.filterToggle;
    if ( isEnable && searchContext.excludes) {
      ig.add(searchContext.excludes!);
    }
    const includes = isEnable && searchContext.includes
      ? (t: string) => ignore().add(searchContext.includes!).test(t).ignored
      : (t: string) => true;
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
    searchContext: SearchContext,
    token: vscode.CancellationToken
  ) {
    for (const [name, type] of await vscode.workspace.fs.readDirectory(
      folder
    )) {
      if( token.isCancellationRequested){
        return;
      }
      const filePath = posix.join(folder.fsPath, name);
      // exclude .gitignore
      if (type === vscode.FileType.File) {
        if (!filter(filePath, false)) {
          continue;
        }
        await this.searchFile(folder.with({ path: filePath }), searchContext);
      } else if (type === vscode.FileType.Directory) {
        if (!filter(filePath, true)) {
          continue;
        }
        await this.searchDirectory(
          filter,
          folder.with({ path: filePath }),
          searchContext,
          token
        );
      }
    }
  }

  async searchFile(uri: vscode.Uri, searchContext: SearchContext) {
    const searchEngine = this.searchEngines.find((v) => v.canApply(uri));
    if (!searchEngine) {
      return;
    }
    const content$ = await vscode.workspace.openTextDocument(uri);
    const result = searchEngine.search(content$, searchContext);
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

  async replace(item: SerachResultItem) {
    if( !item ){
      return;
    }
    const searchResult = new SerachResult(item.document, [item.tag], item.searchContext, ExecuteModes.replace);

    await this.replaceAll(searchResult);

  }

  async replaceAll(searchResult: SerachResult) {
    if( !searchResult ){
      return;
    }
    await this.replaceAllFiles([searchResult]);
  }

  async replaceAllFiles(searchResults: SerachResult[]) {
    const edit = new ReplaceEditTextDocument();

    try{
      for (const searchResult of searchResults) {
        const searchEngine = this.searchEngines.find((v) =>
          v.canApply(searchResult.resourceUri!)
        );
        if (searchEngine) {
          await searchEngine.replace(searchResult, searchResult.searchContext.replace!, edit);
        }
        this.previewProvider.refresh(searchResult.resourceUri!, searchResult.searchContext);
      }
    } catch (e: any) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t("failed to replace: \n{0}", e?.toString() )
      );
      throw e;
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
