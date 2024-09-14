import * as CSSselect from "css-select";
import { pHtmlParser } from "html-parser";
import {
  IPHtmlDocument,
  IPHtmlElement,
  IPHtmlNode
} from "html-parser/dist/interface";
import { PHtmlRawAttributes } from "html-parser/dist/model/PHtmlAttributes";
import { PHtmlDocument } from "html-parser/dist/model/PHtmlDocument";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import * as ts from "typescript";
import * as vscode from "vscode";
import { htmlUtil } from "../util/html-util";
import { SearchContext } from "../model/search-context.model";
import { SearchEngine } from "./search-engine";

type TNode = IPHtmlElement | IPHtmlNode | IPHtmlDocument;
export class JsxHtmlParserAdapter extends SearchEngine {
  suffixes = [".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs"];

  canApply(uri: vscode.Uri) {
    return this.suffixes.some(suffix => uri.path.endsWith(suffix));
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

  validateSearchContext(searchContext: SearchContext) {
    const compiledQuery = CSSselect.compile(searchContext.search);

    return true;
  }
  searchHtml(content: string, searchContext: SearchContext): TNode[] {
    const parser = new pHtmlParser({ skipComment: false, caseSensitive: searchContext.matchCase });
    const rootNode = this.parse(content, parser);
    const result = rootNode.querySelectorAll(searchContext.search);
    return [...result];
  }
  parse(content: string, parser: pHtmlParser) {
    const sourceFile = ts.createSourceFile("dummy.tsx", content, ts.ScriptTarget.ES2015);

    const range = {
      startOpenTag: 0,
      endOpenTag: 0,
      startCloseTag: content.length,
      endCloseTag: content.length,
    };
    const document = new PHtmlDocument(parser, range);

    const stack: Array<PHtmlElement> = [];
    let lastPos = 0;
    const sourceContent = sourceFile.getFullText();
    const flush = (parent: PHtmlElement, end: number) => {
      if (lastPos < end) {
        const commentRanges = ts.getLeadingCommentRanges(sourceContent, lastPos);
        for (const commentRange of commentRanges ?? []) {
          if (lastPos < commentRange.pos) {
            parent.appendChild(createNode(content, lastPos, commentRange.pos, parent));
          }
          const html = (sourceFile).getFullText().slice(commentRange.pos, commentRange.end);
          const maybeHtml = parser.parse(html, { offset: commentRange.pos })!;
          maybeHtml.childNodes.forEach(node => parent.appendChild(node));
          lastPos = commentRange.end;
        }
        if (lastPos < end) {
          parent.appendChild(createNode(content, lastPos, end, parent));
          lastPos = end;
        }
      }
    };
    const createHtmlNode = (tagName: string, attributes: ts.JsxAttributes, isSelfClosing: boolean, tsNode: ts.Node, htmlNode: IPHtmlNode): PHtmlElement => {
      const range = {
        startOpenTag: tsNode.pos,
        endOpenTag: tsNode.end,
        startCloseTag: tsNode.end,
        endCloseTag: tsNode.end,
      };
      const attr = new PHtmlRawAttributes(parser);
      for (const it of attributes.properties) {
        if (ts.isJsxAttribute(it)) {
          let extractLiterals: string[] = [];
          const attrTraversal = (node: ts.Node | undefined) => {
            if (!node) {
              return;
            }
            if (ts.isLiteralExpression(node)) {
              extractLiterals.push(node.text);
            } 
            node.forEachChild((child) => {
              attrTraversal(child);
            });
          };
          attrTraversal(it.initializer);
          attr.add(it.name.getText(sourceFile), extractLiterals.join(" "), it.getFullText(sourceFile));
        } else {
          attr.add(it.expression.getText(sourceFile), "", it.getFullText(sourceFile));
        }
      }
      const trail = content.substring(attributes.end, tsNode.end - 1 - (isSelfClosing ? 1 : 0));
      const node = new PHtmlElement(tagName, htmlNode, attr, isSelfClosing, trail, parser, range);
      return node;
    };
    const createNode = (content: string, start: number, end: number, htmlNode: IPHtmlNode) => {
      const raw = content.substring(start, end);
      const range = {
        startOpenTag: start,
        endOpenTag: end,
        startCloseTag: end,
        endCloseTag: end,
      };
      const node = new PHtmlNode(raw, htmlNode, parser, range);
      return node;
    };
    const traversal = (parent: PHtmlElement, tsNode: ts.Node, pos = 0) => {
      tsNode.forEachChild((node) => {
        // console.log("%s %d %d %d - [%s] %s", "  ".repeat(pos),  node.pos, node.end, lastPos, sourceContent.slice(node.pos, node.end), ts.SyntaxKind[node.kind] );

        if (ts.isJsxOpeningElement(node)) {
          flush(parent, node.pos);
          const child = createHtmlNode(node.tagName.getText(sourceFile), node.attributes, false, node, parent);
          parent.appendChild(child);
          stack.push(child);
          parent = child;
          lastPos = node.end;
        } else if (ts.isJsxClosingElement(node)) {
          flush(parent, node.pos);
          parent._rawCloseTag = node.getText(sourceFile);
          parent.range!.startCloseTag = node.pos;
          parent.range!.endCloseTag = node.end;

          parent = stack.pop()!;
          lastPos = node.end;
        } else if (ts.isJsxSelfClosingElement(node)) {
          flush(parent, node.pos);
          const child = createHtmlNode(node.tagName.getText(sourceFile), node.attributes, true, node, parent);
          parent.appendChild(child);
          lastPos = node.end;
        } else if (ts.isStringLiteralLike(node) || ts.isJSDoc(node) || ts.isTemplateExpression(node)) {
          flush(parent, node.pos);
          const maybeHtml = parser.parse(node.getFullText(sourceFile), { offset: node.pos })!;
          parent.childNodes.push(...maybeHtml.childNodes);
          parent.childNodes.forEach(node => node.setParent(parent));
          lastPos = node.end;
        } else if (node.kind === ts.SyntaxKind.EndOfFileToken) {
          flush(parent, node.pos);
        } else {
          traversal(parent, node, pos + 1);
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
