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
export class ReplacePreviewDocumentProvider
  implements TextDocumentContentProvider, Disposable
{
  searchEngines: SearchEngine[];
  selectItem!: SearchResultTreeItem;
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
      })
    );
  }

  private _onDidChange = new EventEmitter<Uri>();
  get onDidChange(): Event<Uri> {
    return this._onDidChange.event;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
    if (token.isCancellationRequested) {
      return "Canceled";
    }

    try {
      const { context } = JSON.parse(uri.query);
      const searchContext: SearchContext = context;
      const searchEngine = this.searchEngines.find((v) => v.canApply(uri));
      if (!searchEngine) {
        console.warn("can not found appliable engine.");
        return "";
      }

      const searchResult =
        this.selectItem instanceof SearchResultItem
          ? this.selectItem._parent
          : this.selectItem;
      if (!searchResult) {
        return "";
      }
      const edit = new ReplaceEditMemFsTextDocument();
      const text = await edit.openTextDocument(
        Uri.from({ scheme: uri.fragment, path: uri.path })
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
    const preview = getPreviewUri(item.resourceUri, searchContext, item);
    const document = vscode.workspace.openTextDocument(item.resourceUri);
    const range = item instanceof SearchResultItem ? item.range : undefined;
    const options: vscode.TextDocumentShowOptions = {
      selection: range,
      preserveFocus: true,
      preview: true,
    };
    const basefile = path.basename(item.resourceUri.fsPath);

    this.selectItem = item;

    await vscode.commands.executeCommand(
      "vscode.diff",
      item.resourceUri,
      preview,
      vscode.l10n.t(`{0} ↔ [replaced] (Replace Preview)`, basefile),
      options
    );
  }

  refresh(resourceUri: vscode.Uri, item: SearchResultTreeItem, searchContext: SearchContext) {
    this.selectItem = item;

    this._onDidChange.fire(
      getPreviewUri(resourceUri, searchContext, this.selectItem)
    );
  }
}

function getPreviewUri(
  resource: vscode.Uri,
  searchContext: SearchContext,
  item?: SearchResultTreeItem
) {
  const index = item instanceof SearchResultItem ? item.index : undefined;

  return vscode.Uri.from({
    scheme: Constants.SCHEMA_PREVIEW,
    path: resource.path,
    fragment: resource.scheme,
    query: JSON.stringify({ context: searchContext, index: index }),
  });
}
