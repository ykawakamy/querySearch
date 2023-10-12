import * as vscode from "vscode";
import { Constants } from "../constants";
import { QSNode } from "../engine/search-engine";
import { htmlUtil } from "../util/html-util";
import path = require("path");
export class SerachResult extends vscode.TreeItem {
  items: SerachResultItem[];
  resourceUri: vscode.Uri;

  constructor(uri: vscode.Uri, items?: QSNode[]) {
    super(uri);
    this.description = path.dirname(uri.fsPath);
    this.resourceUri = uri;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    this.items =
      items?.map((v,i) => {
        return this.toItem(v, i, uri);
      }) || [];

    this.contextValue = Constants.CONTEXT_VALUE.FILE;
  }

  private toItem(v: QSNode, i: number, uri: vscode.Uri) {
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
    const item = new SerachResultItem(uri, v, i, startOffset, endOffset);
    item.parent = this;
    return item;
  }

  filter(op: (val: SerachResultItem, index: number) => boolean) {
    const filtered = this.items.filter(op).map((v) => v.tag);
    return new SerachResult(this.resourceUri, filtered);
  }
}

export class SerachResultItem extends vscode.TreeItem {

  parent!: SerachResult;

  constructor(
    public resourceUri: vscode.Uri,
    public tag: QSNode,
    public index: number,
    public startOffset: number,
    public endOffset: number
  ) {
    super(resourceUri);
    this.label = tag.toString();
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;

    this.contextValue = Constants.CONTEXT_VALUE.RESULT;

    this.command = {
      command: Constants.COMMAND_QUERYSEARCH_OPENFILE,
      title: "Open File",
      arguments: [resourceUri, startOffset, endOffset, this],
    };
  }
}
