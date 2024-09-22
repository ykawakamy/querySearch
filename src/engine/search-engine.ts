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
    content: string,
    uri: vscode.Uri,
    searchContext: SearchContext
  ): SearchResult | null {
    const result = this.searchHtml(content, searchContext);
    if (result?.length > 0) {
      const sortedNodes = result.sort(
        (a: QSNode, b: QSNode) =>
          (a?.range?.startOpenTag ?? 0) - (b?.range?.startOpenTag ?? 0)
      );
  
      let stack: SearchResultItem[] = [];
      let index = 0;
      const r = new SearchResult(uri, searchContext);
      const items = [];
      for (const node of sortedNodes) {
        const item = new SearchResultItem(uri, node, searchContext);
        let parentIdx = stack.findLastIndex((prev) => {
          const s = Math.min(prev.startOffset, item.startOffset);
          const e = Math.max(prev.endOffset, item.endOffset);
          const c = item.endOffset - item.startOffset;
          const p = prev.endOffset - prev.startOffset;
          return e - s < c + p;
        });
        if (parentIdx !== -1) {
          const parent = stack[parentIdx];
          parent.items.push(item);
          item.parent = parent;
          stack.splice(parentIdx + 1, Infinity, item);
        } else {
          items.push(item);
          stack = [item];
          item.parent = r;
        }
        item.index = index++;
      }

      r.items = items;
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
    const vmContext = { $: $, document: $.parentNode };
    let modified;
    vm.createContext(vmContext);
    try {
      const result = vm.runInContext(replaceExpr, vmContext, {
        timeout: 1000,
      });
      modified = this.getReplacedText($);
    } catch (e) {
      modified = vscode.l10n.t(`failed to replace. [cause: {0}]`, "" + e);
    }
    if (original !== modified) {
      await edit.replace(document.uri, this.getRange(baseTag), modified);
    }
  }
  abstract createClone(v: QSNode): QSNode;

  abstract getRange(baseTag: QSNode): readonly [number, number];
}
