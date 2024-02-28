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
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import * as path from "path";
export class ReplacePreviewDocumentProvider
  implements TextDocumentContentProvider, Disposable
{
  searchEngines: SearchEngine[];
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
      const edit = new ReplaceEditMemFsTextDocument();
      const text = await edit.openTextDocument(
        Uri.from({ scheme: uri.fragment, path: uri.path })
      );
      const { context: searchContext, searchResult } = JSON.parse(uri.query);
      const searchEngine = this.searchEngines.find((v) => v.canApply(uri));
      if (!searchEngine) {
        console.warn("can not found appliable engine.");
        return "";
      }

      // const searchResult = searchEngine.search(text, searchContext);
      if (!searchResult) {
        return "";
      }
      // searchResult.items = searchResult.items.filter(v=>v.index === index);
      try {
        await searchEngine.replace(searchResult, searchContext.replace, edit);
      } catch (e) {
        console.log(e);
      }
      return text.getText();
    } catch (e) {
      return "";
    }
  }

  async openReplacePreview(
    item: SerachResult | SerachResultItem,
    searchContext: SearchContext
  ) {
    const preview = getPreviewUri(item.document.uri, searchContext, item);
    const document = item.document;
    {
      const range =
        item instanceof SerachResultItem
          ? new vscode.Range(
              document.positionAt(item.startOffset),
              document.positionAt(item.endOffset)
            )
          : undefined;
      const options: vscode.TextDocumentShowOptions = {
        selection: range,
        preserveFocus: true,
        preview: true,
      };
      const basefile = path.basename(item.document.uri.fsPath);

      await vscode.commands.executeCommand(
        "vscode.diff",
        item.document.uri,
        preview,
        vscode.l10n.t(`{0} ↔ [replaced] (Replace Preview)`, basefile),
        options
      );
    }
  }

  refresh(resourceUri: vscode.Uri, searchContext: SearchContext) {
    this._onDidChange.fire(getPreviewUri(resourceUri, searchContext));
  }
}

function getPreviewUri(
  resource: vscode.Uri,
  searchContext: SearchContext,
  item?: SerachResult | SerachResultItem
) {
  const searchResult =
    item instanceof SerachResultItem ? item.parent : item;

  return vscode.Uri.from({
    scheme: Constants.SCHEMA_PREVIEW,
    path: resource.path,
    fragment: resource.scheme,
    query: JSON.stringify(
      { context: searchContext, searchResult },
      function (key: string, value: any): any {
        if (
          (
            key === "parent" ||
            key === "searchContext" ||
            key === "_parser" ||
            key === "_parent" ||
            key === "command" 
          )
        ) {
          return undefined;
        }
        return value;
      }
    ),
  });
}
