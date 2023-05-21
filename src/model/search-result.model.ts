import { HTMLElement } from "node-html-parser";
import * as vscode from "vscode";
import { Constants } from "../constants";
import * as HTMLParser from "node-html-parser";
import * as vm from "vm";
import { Utils } from "vscode-uri";
import { htmlUtil } from "../util/html-util";
import { Node } from "../engine/search-engine";
import path = require("path");
export class SerachResult extends vscode.TreeItem {
  items: SerachResultItem[];
  resourceUri: vscode.Uri;

  constructor(uri: vscode.Uri, items?: Node[]) {
    super(uri);
    this.description = path.dirname(uri.fsPath);
    this.resourceUri = uri;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    this.items =
      items?.map((v) => {
        return this.toItem(v, uri);
      }) || [];

    this.contextValue = Constants.CONTEXT_VALUE.FILE;
  }

  private toItem(v: Node, uri: vscode.Uri) {
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
    const item = new SerachResultItem(uri, v, startOffset, endOffset);
    item.parent = this;
    return item;
  }

  filter(op: (val: SerachResultItem, index: number) => boolean) {
    const filtered = this.items.filter(op).map((v) => v.tag);
    return new SerachResult(this.resourceUri, filtered);
  }
}

export class SerachResultItem extends vscode.TreeItem {
  tag: Node;
  startOffset: number;
  endOffset: number;
  parent!: SerachResult;
  resourceUri: vscode.Uri;

  constructor(
    uri: vscode.Uri,
    tag: Node,
    startOffset: number,
    endOffset: number
  ) {
    super(uri);
    this.resourceUri = uri;
    this.label = tag.toString();
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.tag = tag;
    this.startOffset = startOffset;
    this.endOffset = endOffset;

    this.contextValue = Constants.CONTEXT_VALUE.RESULT;

    this.command = {
      command: Constants.COMMAND_QUERYSEARCH_OPENFILE,
      title: "Open File",
      arguments: [uri, startOffset, endOffset],
    };
  }
}
