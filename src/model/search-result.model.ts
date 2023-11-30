import * as vscode from "vscode";
import { Constants, ExecuteMode } from "../constants";
import { QSNode, SearchContext } from "./search-context.model";
import { htmlUtil } from "../util/html-util";
import path = require("path");
export class SerachResult extends vscode.TreeItem {
  items: SerachResultItem[];
  resourceUri: vscode.Uri;
  version: number;

  constructor(
    public document: vscode.TextDocument,
    items: QSNode[],
    public searchContext: SearchContext,
    public executeMode: ExecuteMode
  ) {
    super(document.uri);
    const uri = document.uri;
    this.version = document.version;
    this.resourceUri = uri;
    this.description = path.dirname(uri.fsPath);
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    this.items =
      items?.map((v, i) => {
        return this.toItem(v, i, document, searchContext, executeMode);
      }) || [];

    this.contextValue = executeMode.file;
  }

  private toItem(
    v: QSNode,
    i: number,
    document: vscode.TextDocument,
    searchContext: SearchContext,
    executeMode: ExecuteMode
  ) {
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
    const item = new SerachResultItem(
      document,
      v,
      i,
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
  constructor(
    public document: vscode.TextDocument,
    public tag: QSNode,
    public index: number,
    public startOffset: number,
    public endOffset: number,
    public searchContext: SearchContext,
    public executeMode: ExecuteMode
  ) {
    super(document.uri);
    const uri = document.uri;
    this.label = tag.toString();
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.contextValue = executeMode.item;

    this.command = {
      command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
      title: vscode.l10n.t("Open File"),
      arguments: [this],
    };
  }
}
