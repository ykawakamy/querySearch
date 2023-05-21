import * as HTMLParser from "node-html-parser";
import {
  ReplaceDocument,
  ReplaceEdit,
  ReplaceEditTextDocument,
} from "./replace-edit";
import { NodeHtmlParserAdaptor } from "./node-html-parser";
import { SerachResult, SerachResultItem } from "../model/search-result.model";
import * as vm from "vm";
import * as vscode from "vscode";

export type Node = HTMLParser.HTMLElement | HTMLParser.Node;

export abstract class SearchEngine {
  abstract validateSearchContext(queryExpr: SearchContext): boolean;
  protected abstract searchHtml(
    content: string,
    queryExpr: SearchContext
  ): Node[];
  abstract getReplacedText(node: Node): string;

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
    searchResults: SerachResult[],
    replaceExpr: string,
    edit: ReplaceEdit
  ) {
    try {
      for (const searchResult of searchResults) {
        const uri = searchResult.resourceUri!;
        const document = await edit.openTextDocument(uri!);
        for (const item of searchResult.items) {
          await this._replaceItem(item, document, replaceExpr, edit);
        }
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

    const $ = baseTag.clone();
    const vmContext = { $: $ };
    vm.createContext(vmContext);
    const result = vm.runInContext(replaceExpr, vmContext, {
      timeout: 1000,
    });

    await edit.replace(document.uri, baseTag.range, this.getReplacedText($));
  }
}

export type SearchContext = {
  search: string;
  replace?: string;
  replaceToggle?: boolean;
  filterToggle?: boolean;
  includes?: string;
  excludes?: string;
};
