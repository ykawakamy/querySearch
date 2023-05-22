import { Node, SearchContext, SearchEngine } from "./search-engine";
import * as HTMLParser from "node-html-parser";
import * as CSSselect from "css-select";

export class NodeHtmlParserAdaptor extends SearchEngine {
  validateSearchContext(queryExpr: SearchContext){
    const compiledQuery = CSSselect.compile(queryExpr.search);

    return true;
  };
  searchHtml(content: string, queryExpr: SearchContext): Node[] {
    const rootNode = HTMLParser.parse(content, {
      comment: true,
      voidTag: { closingSlash: false },
    });
    const result = rootNode.querySelectorAll(queryExpr.search);
    return result;
  }
  getReplacedText(node: Node): string{
    return node.parentNode?.toString();
  };
}
