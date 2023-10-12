import * as CSSselect from "css-select";
import { pHtmlParser } from "html-parser";
import {
  IPHtmlDocument,
  IPHtmlElement,
  IPHtmlNode
} from "html-parser/dist/interface";
import { PHtmlAttributes } from "html-parser/dist/model/PHtmlAttributes";
import { PHtmlDocument } from "html-parser/dist/model/PHtmlDocument";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import * as ts from "typescript";
import * as vscode from "vscode";
import { htmlUtil } from "../util/html-util";
import { SearchContext, SearchEngine } from "./search-engine";

type TNode = IPHtmlElement | IPHtmlNode | IPHtmlDocument;
export class JsxHtmlParserAdapter extends SearchEngine<IPHtmlNode> {
  canApply(uri: vscode.Uri) {
    return uri.path.endsWith(".jsx") || uri.path.endsWith(".tsx");
  }
  createClone(v: TNode): TNode {
    if (
      v instanceof PHtmlElement ||
      v instanceof PHtmlNode ||
      v instanceof PHtmlDocument
    ) {
      return v.cloneNode()!;
    }
    throw new Error("unexpected error");
  }

  getRange(baseTag: TNode): readonly [number, number] {
    const range = htmlUtil.getOffsetOfCloseTag(baseTag);
    return [range.startOffset, range.endOffset];
  }

  validateSearchContext(queryExpr: SearchContext) {
    const compiledQuery = CSSselect.compile(queryExpr.search);

    return true;
  }
  searchHtml(content: string, queryExpr: SearchContext): TNode[] {
    const rootNode = this.parse(content);
    const result = rootNode.querySelectorAll(queryExpr.search);
    return [...result];
  }
  parser = new pHtmlParser({ skipComment: false });
  parse(content: string) {
    const sourceFile = ts.createSourceFile("dummy.tsx", content, ts.ScriptTarget.ES2015);
    
    const range = {
      startOpenTag: 0,
      endOpenTag: 0,
      startCloseTag: content.length,
      endCloseTag: content.length,
    };
    const document = new PHtmlDocument(this.parser, range);

    const stack: Array<PHtmlElement> = [];
    let lastPos = 0;
    const flush = (parent: PHtmlElement, end:number) =>{
      if(lastPos < end){
        parent.appendChild(createNode(content, lastPos, end, parent));
      }
      lastPos = end;
    };
    const createHtmlNode = (tagName: string, attributes: ts.JsxAttributes, isSelfClosing: boolean, tsNode: ts.Node, htmlNode: IPHtmlNode): PHtmlElement =>{
      const range = {
        startOpenTag: tsNode.pos,
        endOpenTag: tsNode.end,
        startCloseTag: tsNode.end,
        endCloseTag: tsNode.end,
      };
      const attr = new PHtmlAttributes();
      for( const it of attributes.properties ){
        if( ts.isJsxAttribute(it) ){
          attr.add( it.name.text, it.initializer?.getText(sourceFile) ?? "", it.getFullText(sourceFile));
        }else{
          attr.add( it.expression.getText(sourceFile), "", it.getFullText(sourceFile));
        }
      }
      const trail = content.substring(attributes.end, tsNode.end - 1  - (isSelfClosing ? 1 :0 ));
      const node = new PHtmlElement(tagName, htmlNode, attr, isSelfClosing, trail, this.parser, range);
      return node;
    };
    const createNode = (content: string, start: number, end: number, htmlNode: IPHtmlNode) =>{
      const raw = content.substring(start, end);
      const range = {
        startOpenTag: start,
        endOpenTag: end,
        startCloseTag: end,
        endCloseTag: end,
      };
      const node = new PHtmlNode(raw, htmlNode, this.parser, range);
      return node;
    };
    const traversal = (parent: PHtmlElement, tsNode: ts.Node) => {
      tsNode.forEachChild((node)=>{
        if(ts.isJsxOpeningElement(node)){
          flush(parent, node.pos);
          const child = createHtmlNode(node.tagName.getText(sourceFile), node.attributes, false, node, parent);
          parent.appendChild(child);
          stack.push(child);
          parent = child;
          lastPos = node.end;
        }else if(ts.isJsxClosingElement(node)){
          flush(parent, node.pos);
          parent._rawCloseTag = node.getText(sourceFile);
          parent.range!.startCloseTag = node.pos;
          parent.range!.endCloseTag = node.end;
          
          parent = stack.pop()!;
          lastPos = node.end;
        }else if(ts.isJsxSelfClosingElement(node)){
          flush(parent, node.pos);
          const child = createHtmlNode(node.tagName.getText(sourceFile), node.attributes, true, node, parent);
          parent.appendChild(child);
          lastPos = node.end;
        }else{
          traversal(parent, node);
        }
      });
    };

    traversal(document, sourceFile);
    flush(document, content.length);

    return document;
  }

  getReplacedText(node: TNode): string {
    return node.parentNode?.outerHTML ?? "";
  }
}
