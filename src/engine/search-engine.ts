import * as vm from "vm";
import * as vscode from "vscode";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import {
  ReplaceEdit
} from "./replace-edit";
import { ExecuteModes } from "../constants";
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
  ): SerachResult | null {
    const content = content$.getText();
    const result = this.searchHtml(content, searchContext);
    if (result?.length > 0) {
      const executeMode = searchContext.replaceToggle ? ExecuteModes.replace : ExecuteModes.search;
      const r = new SerachResult(content$, result, searchContext, executeMode);
      return r;
    }
    return null;
  }

  async replace(
    searchResult: SerachResult,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const uri = searchResult.resourceUri!;
    const document = await edit.openTextDocument(uri!);
    if (document.version !== searchResult.version ){
      return;
    }
    for (const item of searchResult.items) {
      if(item.isOverlapping){
        // skip 
        continue;
      }
      await this._replaceItem(item, document, replaceExpr, edit);
    }

    await edit.applyEdit();
  }

  private async _replaceItem(
    item: SerachResultItem,
    document: vscode.TextDocument,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const baseTag = item.tag;

    const $ = this.createClone(baseTag);
    const original = this.getReplacedText($);
    const vmContext = { $: $ };
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
