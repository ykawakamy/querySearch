import * as vscode from "vscode";
import { Constants, ContextValues } from "../constants";
import { SearchContext } from "./search-context.model";
import { htmlUtil } from "../util/html-util";
import path = require("path");
import { QSNode } from "./qs-node.model";

export class SerachResult extends vscode.TreeItem {
  items: SerachResultItem[] = [];
  version: number;

  constructor(
    public document: vscode.TextDocument,
    nodes: QSNode[],
    public searchContext: SearchContext,
  ) {
    super(document.uri);
    this.version = document.version;
    this.description = true;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

    const sortedNodes = nodes.sort(
      (a: QSNode, b: QSNode) =>
      (a?.range?.startOpenTag ?? 0) - (b?.range?.startOpenTag ?? 0)
      );

    let current: SerachResultItem[] = [];
    let stack: SerachResultItem[] = [];
    for (const node of sortedNodes) {
      const item = this.toItem(node, document, searchContext);
      let parentIdx = stack.findLastIndex((prev)=>{
        const s = Math.min(prev.startOffset, item.startOffset);
        const e = Math.max(prev.endOffset, item.endOffset);
        const c = item.endOffset - item.startOffset;
        const p = prev.endOffset - prev.startOffset;
        return (e - s < c + p);
      });
      if (parentIdx!==-1) {
        const parent = stack[parentIdx];
        parent.items.push(item);
        parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        item.parent = parent;

        stack.splice(parentIdx+1,Infinity, item);
      }else{
        this.items.push(item);
        stack = [item];
      }
    }

    this.contextValue = ContextValues.file;

    // this.command = {
    //   command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
    //   title: vscode.l10n.t("Open File"),
    //   arguments: [this],
    // };
  }

  private toItem(
    v: QSNode,
    document: vscode.TextDocument,
    searchContext: SearchContext
  ) {
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
    const item = new SerachResultItem(
      document,
      v,
      startOffset,
      endOffset,
      searchContext
    );
    item.parent = this;
    return item;
  }
}

export class SerachResultItem extends vscode.TreeItem {
  parent!: SerachResult | SerachResultItem;
  isCompleted = false;
  isOverlapping = false;
  items: SerachResultItem[] = [];
  constructor(
    public document: vscode.TextDocument,
    public tag: QSNode,
    public startOffset: number,
    public endOffset: number,
    public searchContext: SearchContext,
  ) {
    super(tag.outerHTML);
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.contextValue = ContextValues.result;

    this.command = {
      command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
      title: vscode.l10n.t("Open File"),
      arguments: [this],
    };
  }
}
