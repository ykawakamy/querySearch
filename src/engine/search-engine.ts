import * as vm from "vm";
import * as vscode from "vscode";
import { SearchResult, SearchResultItem, SearchResultTreeItem } from "../model/search-result.model";
import {
  ReplaceEdit
} from "./replace-edit";
import { SearchContext } from "../model/search-context.model";
import { QSNode } from "../model/qs-node.model";


export abstract class SearchEngine {
  abstract canApply(uri: vscode.Uri): boolean;
  abstract validateSearchContext(searchContext: SearchContext): boolean;
  protected abstract searchHtml(
    content: string,
    searchContext: SearchContext
  ): QSNode[];
  abstract getReplacedText(node: QSNode): string;

  search(
    content$: vscode.TextDocument,
    searchContext: SearchContext
  ): SearchResult | null {
    const content = content$.getText();
    const result = this.searchHtml(content, searchContext);
    if (result?.length > 0) {
      const r = new SearchResult(content$.uri, content$, result, searchContext);
      return r;
    }
    return null;
  }

  async replace(
    searchResult: SearchResultTreeItem,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const uri = searchResult.resourceUri!;
    const document = await vscode.workspace.openTextDocument(uri!);
    for (const item of searchResult.items) {
      await this._replaceItem(item, document, replaceExpr, edit);
    }
  }

  private async _replaceItem(
    item: SearchResultItem,
    document: vscode.TextDocument,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const baseTag = item.tag;

    const $ = this.createClone(baseTag);
    const original = this.getReplacedText($);
    const vmContext = { $: $, document:$.parentNode };
    vm.createContext(vmContext);
    const result = vm.runInContext(replaceExpr, vmContext, {
      timeout: 1000,
    });
    const modified = this.getReplacedText($);
    if (original !== modified) {
      await edit.replace(document.uri, this.getRange(baseTag), modified);
    }
  }
  abstract createClone(v: QSNode): QSNode;

  abstract getRange(baseTag: QSNode): readonly [number, number];
}
