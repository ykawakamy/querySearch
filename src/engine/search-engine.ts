import { IPHtmlElement, IPHtmlNode } from "html-parser/dist/interface";
import * as ts from "typescript";
import * as vm from "vm";
import * as vscode from "vscode";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import {
  ReplaceDocument,
  ReplaceEdit
} from "./replace-edit";

export type QSNode = any | IPHtmlNode | IPHtmlElement | ts.Node;

export abstract class SearchEngine<TNode> {
  abstract canApply(uri : vscode.Uri): boolean;
  abstract validateSearchContext(queryExpr: SearchContext): boolean;
  protected abstract searchHtml(
    content: string,
    queryExpr: SearchContext
  ): TNode[];
  abstract getReplacedText(node: TNode): string;

  search(
    content$: ReplaceDocument,
    queryExpr: SearchContext
  ): SerachResult | null {
    const content = content$.getText();
    const result = this.searchHtml(content, queryExpr);
    if (result?.length > 0) {
      const r = new SerachResult(content$.uri, result);
      return r;
    }
    return null;
  }

  async replace(
    searchResult: SerachResult,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    try {
      const uri = searchResult.resourceUri!;
      const document = await edit.openTextDocument(uri!);
      for (const item of searchResult.items) {
        await this._replaceItem(item, document, replaceExpr, edit);
      }

      await edit.applyEdit();
    } catch (e: any) {
      await vscode.window.showErrorMessage(
        "failed to replace: \n" + e?.toString()
      );
      console.log(e, e.stack);
    }
  }

  private async _replaceItem(
    item: SerachResultItem,
    document: ReplaceDocument,
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    const baseTag = item.tag;

    const $ = this.createClone(baseTag);
    const vmContext = { $: $ };
    vm.createContext(vmContext);
    const result = vm.runInContext(replaceExpr, vmContext, {
      timeout: 1000,
    });

    await edit.replace(document.uri, this.getRange(baseTag), this.getReplacedText($));
  }
  abstract createClone(v: TNode) :TNode;

  abstract getRange(baseTag: TNode): readonly [number, number] ;
}

export type SearchContext = {
  search: string;
  replace?: string;
  replaceToggle?: boolean;
  filterToggle?: boolean;
  includes?: string;
  excludes?: string;
};

