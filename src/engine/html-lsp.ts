import * as htmlLsp from "vscode-html-languageservice";
import { Node, SearchContext, SearchEngine } from "./search-engine";
import * as vscode from "vscode";
import { ReplaceDocument } from "./replace-edit";

const parser = htmlLsp.getLanguageService();

export class VscodeHtmlLspAdaptor extends SearchEngine {

  validateSearchContext(queryExpr: SearchContext) {
    return true;
  }
  searchHtml(content: string, queryExpr: SearchContext): Node[] {
    const rootNode = parser.parseHTMLDocument(<any>{getText:()=>content});
    // const result = rootNode.querySelectorAll(queryExpr.expression);
    return [];
  }
  getReplacedText(node: Node): string {
    return node.parentNode?.toString();
  }
}
