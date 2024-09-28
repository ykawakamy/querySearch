import ignore from "ignore";
import { minimatch } from "minimatch";
import * as vscode from "vscode";
import { Constants } from "../constants";
import { ReplaceEditTextDocument } from "../engine/replace-edit";
import { SearchEngine } from "../engine/search-engine";
import { ReplacedEvent } from "../model/replaced-event";
import { SearchContext } from "../model/search-context.model";
import {
  SearchResult,
  SearchResultItem,
  SearchResultTreeItem,
} from "../model/search-result.model";
import { ReplacePreviewDocumentProvider } from "./replace-preview";

type PathMatcher = (filePath: vscode.Uri, isFolder: boolean) => boolean;

export class SearchResultPanelProvider
  implements vscode.TreeDataProvider<SearchResult> {

  latestSearchContext!: SearchContext;
  private _result: SearchResult[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<SearchResult | undefined> =
    new vscode.EventEmitter<SearchResult | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SearchResult | undefined> =
    this._onDidChangeTreeData.event;

  searchEngines: SearchEngine[];
  cancellation?: vscode.CancellationTokenSource;
  constructor(
    private previewProvider: ReplacePreviewDocumentProvider,
    ...searchEngines: SearchEngine[]
  ) {
    this.searchEngines = searchEngines;
  }

  init(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged()),
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e))
    );
  }

  clearResult() {
    this._result = [];
    this._onDidChangeTreeData.fire(undefined);
  }
  addResult(r: SearchResult) {
    this._result.push(r);
    // this._onDidChangeTreeData.fire(undefined);
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

    const r = searchEngine.search(document.getText(), uri, this.latestSearchContext);
    await this.mergeResult(new ReplacedEvent(uri, index, r));
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(offset?: SearchResultTreeItem): Thenable<any[]> {
    if (offset instanceof SearchResult) {
      return Promise.resolve(offset.items);
    }
    if (offset instanceof SearchResultItem) {
      return Promise.resolve(offset.items);
    }
    return Promise.resolve(this._result);
  }

  private async mergeResult(replaceEvent: ReplacedEvent) {
    if (!replaceEvent.newResult) {
      this._result.splice(replaceEvent.index, 1);
      return;
    }
    const oldRootItems = this._result[replaceEvent.index];
    const newRootItems = replaceEvent.newResult;

    let change: SearchResultTreeItem = replaceEvent.newResult;
    function recursive(
      oldItems: SearchResultTreeItem,
      newItems: SearchResultTreeItem
    ) {
      if (oldItems.items.length !== newItems.items.length) {
        newItems.isExpanded = true;
        change = newItems;
        return;
      }
      for (let i = 0; i < oldItems.items.length; i++) {
        if (oldItems.items[i].items?.length > 0) {
          recursive(oldItems.items[i], newItems.items[i]);
        }
        newItems.isExpanded = oldItems.isExpanded;
      }
    }
    recursive(oldRootItems, newRootItems);
    this._result[replaceEvent.index] = replaceEvent.newResult;
    await this.previewProvider.refresh(
      replaceEvent.uri,
      change,
      this.latestSearchContext
    );
  }



  getTreeItem(offset: SearchResultTreeItem): vscode.TreeItem {
    return offset.toTreeItem();
  }

  async searchWorkspace(
    searchContext: SearchContext,
    webview: vscode.Webview
  ) {
    try {
      for (const searchEngine of this.searchEngines) {
        searchEngine.validateSearchContext(searchContext);
      }
    } catch (e) {
      const msg = vscode.l10n.t("invalid search expression.");
      void webview.postMessage({ error: { searchInput: msg } });
      return;
    }
    void webview.postMessage({ error: {} });

    this.latestSearchContext = searchContext;
    if (this.cancellation) {
      this.cancellation.cancel();
    }
    const cancellation = new vscode.CancellationTokenSource();
    this.cancellation = cancellation;
    await vscode.window.withProgress(
      {
        location: { viewId: Constants.VIEW_ID_QUERY },
        cancellable: true,
      },
      async (progress) => {
        progress.report({
          message: vscode.l10n.t("searching..."),
        });

        this.clearResult();

        const gitIgnorePatterns: Record<number, string[]> = {};
        const workspaceFolders = vscode.workspace.workspaceFolders?.filter(
          (folder) => folder.uri.scheme === "file"
        ) ?? [];

        if (searchContext.isUseSettings) {
          for (const workspace of workspaceFolders) {
            gitIgnorePatterns[workspace.index] = await this.getIgnorePattern(workspace.uri);
          }
        }
        const isEnable = searchContext.filterToggle;
        const splitGlobComma = (str: string) => {
          const result = [];
          let buf = "";
          let level = 0;
          for (const ch of str) {
            if (ch === "{") { level++; }
            if (ch === "}") { level -= level > 0 ? 1 : 0; }

            if (ch === "," && level === 0 && buf.length > 0) {
              result.push(buf);
              buf = "";
            } else {
              buf += ch;
            }
          }
          if (buf.length > 0) {
            result.push(buf);
          }
          return result;
        };
        const includes = splitGlobComma(searchContext.includes).map(x => {
          if (!x) {
            return () => false;
          }
          return (path: string) => new minimatch.Minimatch(`{,**/}${x}{,/**}`).match(path);
        });
        const excludes = splitGlobComma(searchContext.excludes).map(x => {
          if (!x) {
            return () => false;
          }
          return (path: string) => new minimatch.Minimatch(`{,**/}${x}{,/**}`).match(path);
        });

        const filter = (uri: vscode.Uri, isFolder: boolean) => {
          const parentWorkspace = vscode.workspace.getWorkspaceFolder(uri);
          const relativePath = vscode.workspace.asRelativePath(uri);
          if (searchContext.isUseSettings && parentWorkspace) {
            const ig = ignore().add(gitIgnorePatterns[parentWorkspace.index]);
            if (ig.test(relativePath).ignored) {
              return false;
            }
          }
          if (excludes.some(x => x(relativePath))) {
            return false;
          }
          if (includes.length === 0 || includes.some(x => x(relativePath))) {
            return true;
          } else {
            if (!isFolder) {
              return false;
            }
          }
          return true;
        };

        const result: SearchResult[] = [];
        if (searchContext.isOnlyOpened) {
          for (const tabGroups of vscode.window.tabGroups.all) {
            for (const tabGroup of tabGroups.tabs) {
              if (tabGroup.input instanceof vscode.TabInputText) {
                const uri = tabGroup.input.uri;
                if (!filter(uri, false)) {
                  continue;
                }
                const item = await this.searchFile(uri, searchContext);
                if (item) { result.push(item); }
              }
            }
          }
        } else {
          for (const workspaceFolder of workspaceFolders) {
            await this.searchDirectory(
              result,
              filter,
              workspaceFolder.uri,
              searchContext,
              cancellation.token
            );
          }
          // const files = await vscode.workspace.findFiles(includes, excludes, undefined, cancellation.token);
          // for (const file of files) {
          //   if( cancellation.token.isCancellationRequested){
          //     return;
          //   }
          //   await this.searchFile(file, searchContext);
          // }
        }

        this._result = result;
        this._onDidChangeTreeData.fire(undefined);
        progress.report({ increment: 100 });
      }
    );
  }



  async searchDirectory(
    result: SearchResult[],
    filter: PathMatcher,
    folder: vscode.Uri,
    searchContext: SearchContext,
    token: vscode.CancellationToken
  ) {
    for (const [name, type] of await vscode.workspace.fs.readDirectory(
      folder
    )) {
      if (token.isCancellationRequested) {
        return;
      }
      const uri = vscode.Uri.joinPath(folder, name);
      // exclude .gitignore
      if (type === vscode.FileType.File) {
        if (!filter(uri, false)) {
          continue;
        }
        const item = await this.searchFile(uri, searchContext);
        if (item) { result.push(item); }
      } else if (type === vscode.FileType.Directory) {
        if (!filter(uri, true)) {
          continue;
        }
        await this.searchDirectory(
          result,
          filter,
          uri,
          searchContext,
          token
        );
      }
    }
  }

  async searchFile(uri: vscode.Uri, searchContext: SearchContext) {
    const searchEngine = this.searchEngines.find((v) => v.canApply(uri));
    if (!searchEngine) {
      return null;
    }

    const content = await readFileToString(uri);
    const result = searchEngine.search(content, uri, searchContext);
    return result;
  }
  private async getIgnorePattern(workspaceFolder: vscode.Uri) {
    const gitIgnore = await vscode.workspace.fs
      .readFile(vscode.Uri.joinPath(workspaceFolder, ".gitignore"));
    const ignoreList = new TextDecoder().decode(gitIgnore)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    const searchExclude = vscode.workspace.getConfiguration("search").get<Record<string, boolean>>("exclude", {});
    ignoreList.push(...Object.keys(searchExclude).filter((k) => searchExclude[k]).values());
    const filesExclude = vscode.workspace.getConfiguration("files").get<Record<string, boolean>>("exclude", {});
    ignoreList.push(...Object.keys(filesExclude).filter((k) => filesExclude[k]).values());

    return ignoreList;
  }

  async replace(item: SearchResultItem) {
    if (!item) {
      return;
    }
    const searchResult = new SearchResult(item.resourceUri, item.searchContext);
    searchResult.items = [item];

    await this.replaceAll(searchResult);
  }

  async replaceAll(searchResult: SearchResultTreeItem) {
    if (!searchResult) {
      return;
    }
    await this.replaceAllFiles([searchResult]);
  }

  async replaceAllFiles(searchResults?: SearchResultTreeItem[] | undefined) {
    searchResults ??= this._result;
    const edit = new ReplaceEditTextDocument();

    try {
      for (const searchResult of searchResults) {
        const searchEngine = this.searchEngines.find((v) =>
          v.canApply(searchResult.resourceUri!)
        );
        if (searchEngine) {
          await searchEngine.replace(
            searchResult,
            this.latestSearchContext.replaceContext.replace!,
            edit
          );
        }
      }
      await edit.applyEdit();
    } catch (e: any) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t("failed to replace: \n{0}", e?.toString())
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

  async expandTree(item: SearchResultTreeItem | undefined, isExpanded: boolean) {
    const items = item ? [item] : this._result;
    const recursive = (items: SearchResultTreeItem[] )=>{
      for (const item of items) {
        item.isExpanded = isExpanded;
        recursive(item.items);
      }
    };
    recursive(items);
    this._onDidChangeTreeData.fire(undefined);
  }
}

// TODO: vscode.workspace.openTextDocument was trigger code analyzer(e.g. ts language server)
async function readFileToString(uri: vscode.Uri): Promise<string> {
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder(undefined, { fatal: true }).decode(bytes);
  } catch (e) {
    // fallback
    const document = await vscode.workspace.openTextDocument(uri);
    return document.getText();
  }
}

