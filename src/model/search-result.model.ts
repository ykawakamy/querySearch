import * as vscode from "vscode";
import { Constants, ExecuteMode } from "../constants";
import { SearchContext } from "./search-context.model";
import { htmlUtil } from "../util/html-util";
import path = require("path");
import { QSNode } from "./qs-node.model";

export class SerachResult extends vscode.TreeItem {
  items: SerachResultItem[];
  version: number;

  constructor(
    public document: vscode.TextDocument,
    nodes: QSNode[],
    public searchContext: SearchContext,
    public executeMode: ExecuteMode
  ) {
    super(document.uri);
    this.version = document.version;
    this.description = path.dirname(document.uri.fsPath);
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    
    this.items = [];
    let prev = null;
    const sortedNodes = nodes.sort((a:QSNode,b:QSNode)=> ( (a?.range?.startOpenTag ?? 0) - (b?.range?.startOpenTag ?? 0) ) );
    for( const node of sortedNodes ){
        const item = this.toItem(node, document, searchContext, executeMode);
        if(prev){
          const s = Math.min(prev.startOffset, item.startOffset);
          const e = Math.max(prev.startOffset, item.startOffset);
          const c = item.endOffset - item.startOffset;
          const p = prev.endOffset - prev.startOffset;
          if( e-s < c + p ) {
            item.isOverlapping = true;
          }
        }
        this.items.push(item);

        prev = item;
      
    }

    this.contextValue = executeMode.file;
  }

  private toItem(
    v: QSNode,
    document: vscode.TextDocument,
    searchContext: SearchContext,
    executeMode: ExecuteMode
  ) {
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
    const item = new SerachResultItem(
      document,
      v,
      startOffset,
      endOffset,
      searchContext,
      executeMode
    );
    item.parent = this;
    return item;
  }
}

export class SerachResultItem extends vscode.TreeItem {
  parent!: SerachResult;
  isCompleted = false;
  isOverlapping = false;
  constructor(
    public document: vscode.TextDocument,
    public tag: QSNode,
    public startOffset: number,
    public endOffset: number,
    public searchContext: SearchContext,
    public executeMode: ExecuteMode
  ) {
    super(document.uri);
    const uri = document.uri;
    this.label = tag.outerHTML;
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.contextValue = executeMode.item;

    this.command = {
      command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
      title: vscode.l10n.t("Open File"),
      arguments: [this],
    };
  }
}
