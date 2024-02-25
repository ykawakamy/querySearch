import * as CSSselect from "css-select";
import { pHtmlParser } from "html-parser";
import { IPHtmlDocument, IPHtmlElement, IPHtmlNode } from "html-parser/dist/interface";
import { PHtmlDocument } from "html-parser/dist/model/PHtmlDocument";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import * as vscode from "vscode";
import { htmlUtil } from "../util/html-util";
import { SearchContext } from "../model/search-context.model";
import { SearchEngine } from "./search-engine";
import { QSNode } from "../model/qs-node.model";

export class NodeHtmlParserAdaptor extends SearchEngine {
  canApply( uri: vscode.Uri){
    return uri.path.endsWith(".html") || uri.path.endsWith(".htm");
  }
  createClone(v: QSNode): QSNode {
    if( v instanceof PHtmlElement || v instanceof PHtmlNode || v instanceof PHtmlDocument ){
      return v.cloneNode()!;
    }
    throw new Error("unexpected error");
  }

   getRange(baseTag: QSNode): readonly [number, number] {
    const range = htmlUtil.getOffsetOfCloseTag(baseTag);
    return [range.startOffset, range.endOffset];
  }



  validateSearchContext(searchContext: SearchContext){
    const compiledQuery = CSSselect.compile(searchContext.search);

    return true;
  };
  searchHtml(content: string, searchContext: SearchContext): QSNode[] {
    const parser = new pHtmlParser({skipComment: false, caseSensitive: searchContext.matchCase});

    const rootNode = parser.parse(content);
    const result = rootNode.querySelectorAll(searchContext.search);
    return [...result];
  }
  getReplacedText(node: QSNode): string{
    return node.parentNode?.outerHTML ?? "";
  };
  
}
