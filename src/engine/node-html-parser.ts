import { QSNode, SearchContext, SearchEngine } from "./search-engine";
import * as HTMLParser from "node-html-parser";
import * as CSSselect from "css-select";
import { pHtmlParser } from "html-parser";
import { PHtmlDocument } from "html-parser/dist/model/PHtmlDocument";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import { IPHtmlElement, IPHtmlNode, IPHtmlDocument } from "html-parser/dist/interface";
import { htmlUtil } from "../util/html-util";
import * as vscode from "vscode";

type TNode = IPHtmlElement | IPHtmlNode | IPHtmlDocument;
export class NodeHtmlParserAdaptor extends SearchEngine<TNode> {
  canApply( uri: vscode.Uri){
    return uri.path.endsWith(".html") || uri.path.endsWith(".htm");
  }
  createClone(v: TNode): TNode {
    if( v instanceof PHtmlElement || v instanceof PHtmlNode || v instanceof PHtmlDocument ){
      return v.cloneNode()!;
    }
    throw new Error("unexpected error");
  }

   getRange(baseTag: TNode): readonly [number, number] {
    const range = htmlUtil.getOffsetOfCloseTag(baseTag);
    return [range.startOffset, range.endOffset];
  }


  parser = new pHtmlParser({skipComment: false});
  validateSearchContext(queryExpr: SearchContext){
    const compiledQuery = CSSselect.compile(queryExpr.search);

    return true;
  };
  searchHtml(content: string, queryExpr: SearchContext): TNode[] {
    const rootNode = this.parser.parse(content);
    const result = rootNode.querySelectorAll(queryExpr.search);
    return [...result];
  }
  getReplacedText(node: TNode): string{
    return node.parentNode?.outerHTML ?? "";
  };
  
}
