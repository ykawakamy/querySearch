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
import { SerachResultItem } from "../model/search-result.model";
import path = require("path");
import { t } from "@vscode/l10n";

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
      vscode.workspace.registerFileSystemProvider("memfs", new MemFS, {isReadonly: true})
    );
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((change) => {
        if(change.contentChanges.length > 0 ){
          // skip
          return;
        }
        const editors = vscode.window.visibleTextEditors.filter(
          (editor) => {
            return editor.document.uri.path === change.document.uri.path 
              && editor.document.uri.scheme === Constants.SCHEMA_PREVIEW;
          }
        );
        for(const editor of editors) {
          this._onDidChange.fire(editor.document.uri);
        }
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

    try{
      const edit = new ReplaceEditMemFsTextDocument();
      const text = await edit.openTextDocument(
        Uri.from({ scheme: uri.fragment, path: uri.path })
      );
      const {searchContext} = JSON.parse(uri.query) ;
      const searchEngine = this.searchEngines.find(v=>v.canApply(uri));
      if( !searchEngine){
        console.warn("can not found appliable engine.");
        return "";
      }
  
      const searchResult = searchEngine.search(text, searchContext);
      if (!searchResult){
        return "";
      }
      // searchResult.items = searchResult.items.filter(v=>v.index === index);
      await searchEngine.replace(searchResult, searchContext.replace, edit);
  
      return text.getText();
    }catch(e){
      return "";
    }
  }

  async openReplacePreview(item: SerachResultItem, searchContext: SearchContext) {
    const start = item.startOffset;
    const end = item.endOffset;
    const preview = getPreviewUri(item.document.uri, searchContext, item);
    const document = item.document;
    {
      const range = new vscode.Range(
        document.positionAt(start),
        document.positionAt(end)
      );
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
        t(`{0} ↔ [replaced] (Replace Preview)`, basefile),
        options
      );
      // this._onDidChange.fire(preview);
    };
  }
}

export function getPreviewUri(resource: vscode.Uri, searchContext: SearchContext, item: SerachResultItem) {
  return vscode.Uri.from({
    scheme: Constants.SCHEMA_PREVIEW,
    path: resource.path,
    fragment: resource.scheme,
    query: JSON.stringify({ searchContext, index: item.index }),
  });
}

