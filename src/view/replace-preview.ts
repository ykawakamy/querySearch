import * as vscode from "vscode";
import {
  Disposable,
  Event,
  EventEmitter,
  TextDocumentContentProvider,
  Uri,
} from "vscode";

import { Constants } from "../constants";
import { SearchEngine } from "../engine/search-engine";
import { MemFS } from "../engine/inmemory-fsprovider";
import { ReplaceEditMemFsTextDocument } from "../engine/replace-edit";
import { SearchContext } from "../model/search-context.model";
import { SearchResult, SearchResultItem, SearchResultTreeItem } from "../model/search-result.model";
import * as path from "path";

export interface OpenedDiffContext {
  sourceUri: vscode.Uri;
  previewUri: vscode.Uri;
  searchItem: SearchResultTreeItem;
}
export class ReplacePreviewDocumentProvider
  implements TextDocumentContentProvider, Disposable {
  searchEngines: SearchEngine[];

  openedDiffs: OpenedDiffContext[] = [];

  constructor(..._searchEngines: SearchEngine[]) {
    this.searchEngines = _searchEngines;
  }

  init(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        Constants.SCHEMA_PREVIEW,
        this
      ),
      vscode.workspace.registerFileSystemProvider("memfs", new MemFS(), {
        isReadonly: true,
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        const uri = document.uri.toString();
        this.openedDiffs = this.openedDiffs.filter(x => {
          const preserve = x.sourceUri.toString() !== uri
            || x.previewUri.toString() !== uri;
            if(!preserve){
              console.log("close %s", x.previewUri.toString());
            }
          return preserve;
        });
      }),
    );
    // TODO: 
    // vscode.workspace.onDidChangeTextDocument((e) => {
    //   if (e.contentChanges.length === 0) {
    //     return;
    //   }
    //   if (this.preview && e.document.uri.toString() === this.uri?.toString()) {
    //     this._onDidChange.fire(this.preview);
    //   }
    // });
  }

  private _onDidChange = new EventEmitter<Uri>();
  get onDidChange(): Event<Uri> {
    return this._onDidChange.event;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  async provideTextDocumentContent(
    previewUri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
    if (token.isCancellationRequested) {
      return "Canceled";
    }

    try {
      const searchContext: SearchContext = JSON.parse(previewUri.query).context;
      const searchEngine = this.searchEngines.find((v) => v.canApply(previewUri));
      if (!searchEngine) {
        console.warn("can not found appliable engine.");
        return vscode.l10n.t("can not found appliable engine.");
      }

      const context = this.openedDiffs.find(x => x.previewUri.toString() === previewUri.toString());
      if (!context) {
        return "";
      }
      const searchResult = context.searchItem instanceof SearchResultItem
          ? context.searchItem.parent
          : context.searchItem;
      if (!searchResult) {
        return vscode.l10n.t("not found result.");;
      }
      const edit = new ReplaceEditMemFsTextDocument();
      const text = await edit.openTextDocument(
        Uri.from({ scheme: previewUri.fragment, path: previewUri.path })
      );
      await searchEngine.replace(searchResult, searchContext.replaceContext.replace, edit);
      await edit.applyEdit();
      return text.getText();
    } catch (e) {
    }
    return "";
  }

  async openReplacePreview(
    item: SearchResult | SearchResultItem,
    searchContext: SearchContext
  ) {
    const previewUri = getPreviewUri(item.resourceUri, searchContext, item);
    const document = await vscode.workspace.openTextDocument(item.resourceUri);
    const range = item instanceof SearchResultItem ? item.getRange(document) : undefined;
    const options: vscode.TextDocumentShowOptions = {
      selection: range,
      preserveFocus: true,
      preview: true,
    };
    const basefile = path.basename(item.resourceUri.fsPath);

    const context = this.openedDiffs.find(x => x.previewUri.toString() === previewUri.toString());
    if (context) {
      context.searchItem = item;
      this._onDidChange.fire(context.previewUri);
    }else{
      this.openedDiffs.push({
        searchItem: item,
        previewUri: previewUri,
        sourceUri: item.resourceUri,
      });
    }

    await vscode.commands.executeCommand(
      "vscode.diff",
      item.resourceUri,
      previewUri,
      vscode.l10n.t(`{0} ↔ [replaced] (Replace Preview)`, basefile),
      options
    );
  }

  async refresh(resourceUri: vscode.Uri, item: SearchResultTreeItem, searchContext: SearchContext) {
    const preview = getPreviewUri(item.resourceUri, searchContext, item);
    const context = this.openedDiffs.find(x => x.previewUri.toString() === preview.toString());
    if (context) {
      context.searchItem = item;
      this._onDidChange.fire(context.previewUri);
      console.log("refresh %s", resourceUri.toString() );
    }
  }
}

function getPreviewUri(
  resource: vscode.Uri,
  searchContext: SearchContext,
  item?: SearchResultTreeItem
) {
  return vscode.Uri.from({
    scheme: Constants.SCHEMA_PREVIEW,
    path: resource.path,
    fragment: resource.scheme,
    query: JSON.stringify({ context: searchContext }),
  });
}
