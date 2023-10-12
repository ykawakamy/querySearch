import * as vscode from "vscode";
import {
  Disposable,
  Event,
  EventEmitter,
  TextDocumentContentProvider,
  Uri,
} from "vscode";
import { Constants } from "../constants";
import { ReplaceEditInMemory } from "../engine/replace-edit";
import { SearchContext, SearchEngine } from "../engine/search-engine";

export class ReplacePreviewDocumentProvider
  implements TextDocumentContentProvider, Disposable
{
  searchEngines: SearchEngine<any>[];
  constructor(..._searchEngines: SearchEngine<any>[]) {
    this.searchEngines = _searchEngines;
  }

  init(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        Constants.SCHEMA_PREVIEW,
        this
      )
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

    const edit = new ReplaceEditInMemory();
    const text = await edit.openTextDocument(
      uri.with({ scheme: uri.fragment, path: uri.path })
    );
    const {searchContext, index} = JSON.parse(uri.query) ;
    const searchEngine = this.searchEngines.find(v=>v.canApply(uri));
    if( !searchEngine){
      console.warn("can not found appliable engine.");
      return "";
    }

    const searchResult = searchEngine.search(text, searchContext);
    if (!searchResult){
      return "";
    }
    searchResult.items = searchResult.items.filter(v=>v.index === index);
    await searchEngine.replace(searchResult, searchContext.replace, edit);

    return text.getText();
  }
}
