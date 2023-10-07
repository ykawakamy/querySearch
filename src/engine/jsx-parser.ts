import { QSNode, SearchContext, SearchEngine } from "./search-engine";
import * as HTMLParser from "node-html-parser";
import * as CSSselect from "css-select";
import { pHtmlParser } from "html-parser";
import * as ts from "typescript";
import { Adapter, Predicate } from "css-select/lib/types";
import * as vscode from "vscode";

export class JsxParserAdapter extends SearchEngine<ts.Node> {
  canApply( uri: vscode.Uri){
    return uri.path.endsWith(".jsx") || uri.path.endsWith(".tsx");
  }

  createClone(v: ts.Node): ts.Node {
    return ts.createSourceFile("", v.toString(), ts.ScriptTarget.ES2015);

  }
  getRange(baseTag: ts.Node): readonly [number, number] {
    throw new Error("Method not implemented.");
  }
  validateSearchContext(queryExpr: SearchContext) {
    const compiledQuery = CSSselect.compile(queryExpr.search);

    return true;
  }
  searchHtml(content: string, queryExpr: SearchContext): ts.Node[] {
    const rootNode = this.parse(content);
    const result = CSSselect.selectAll(queryExpr.search, rootNode, {
      adapter: adapter,
    });
    return [...result];
  }
  parse(content: string) {
    const sourceFile = ts.createSourceFile("", content, ts.ScriptTarget.ES2015);
    return sourceFile;
  }
  getReplacedText(node: ts.Node): string {
    return node.toString() ?? "";
  }
}

export class JsxAdapter implements Adapter<ts.Node, ts.Node> {
  isTag(node: ts.Node): node is ts.Node {
    switch (node.kind) {
      // case ts.SyntaxKind.JsxElement:
      // case ts.SyntaxKind.JsxFragment:
      // case ts.SyntaxKind.JsxClosingElement:
      case ts.SyntaxKind.JsxOpeningElement:
      case ts.SyntaxKind.JsxSelfClosingElement:
        return true;
    }
    return false;
  }
  existsOne(test: Predicate<ts.Node>, elems: ts.Node[]): boolean {
    return !!elems.find(test);
  }
  getAttributeValue(elem: ts.Node, name: string): string | undefined {
    const attr = elem.getChildren().find(v=>v.kind === ts.SyntaxKind.JsxAttributes)?.
    getChildren().find(v=>v.kind === ts.SyntaxKind.JsxAttribute && v.getChildAt(0).getText() === name);
    return attr?.getChildAt(1).getText();
      
  }
  getChildren(node: ts.Node): ts.Node[] {
    if( node.kind === ts.SyntaxKind.JsxOpeningElement){
      // trim JsxOpeningElement and JsxClosingElement
      return node.parent.getChildren().slice(1,-1);
    }
    return [];
  }
  getName(elem: ts.Node): string {
    if(this.isTag(elem)){
      return elem.getChildAt(0).getText();
    }
    return "";
  }
  getParent(node: ts.Node): ts.Node | null {
    return node.parent;
  }
  getSiblings(node: ts.Node): ts.Node[] {
    return node.parent?.parent?.getChildren() ?? [];
  }
  // prevElementSibling(node: ts.Node): ts.Node | null {
  //   throw new Error();
  // }
  getText(node: ts.Node): string {
    return node.getFullText();
  }
  hasAttrib(elem: ts.Node, name: string): boolean {
    return !!this.getAttributeValue(elem, name);
  }
  removeSubsets(nodes: ts.Node[]): ts.Node[] {
    let idx = nodes.length;
    let node;
    let ancestor;
    let replace;

    // Check if each node (or one of its ancestors) is already contained in the
    // array.
    while (--idx > -1) {
      node = ancestor = nodes[idx];

      // Temporarily remove the node under consideration
      nodes[idx] = null!;
      replace = true;

      while (ancestor) {
        if (nodes.indexOf(ancestor) > -1) {
          replace = false;
          nodes.splice(idx, 1);
          break;
        }
        ancestor = this.getParent(ancestor);
      }

      // If the node has been found to be unique, re-insert it.
      if (replace) {
        nodes[idx] = node;
      }
    }

    return nodes;
  }
  findAll(test: Predicate<ts.Node>, nodes: ts.Node[]): ts.Node[] {
    let result: ts.Node[] = [];

    for (const node of nodes) {
      if (!this.isTag(node)) {
        continue;
      }
      if (test(node)) {
        result.push(node);
      }
      const childs = this.getChildren(node);
      if (childs) {
        result = result.concat(this.findAll(test, childs));
      }
    }
    return result;
  }
  findOne(test: Predicate<ts.Node>, elems: ts.Node[]): ts.Node | null {
    let elem = null as ts.Node | null;

    for (let i = 0, l = elems?.length; i < l && !elem; i++) {
      const el = elems[i];
      if (test(el)) {
        elem = el;
      } else {
        const childs = this.getChildren(el);
        if (childs && childs.length > 0) {
          elem = this.findOne(test, childs);
        }
      }
    }

    return elem;
  }
  equals(a: ts.Node, b: ts.Node): boolean {
    return a === b;
  }
}

const adapter = new JsxAdapter();
