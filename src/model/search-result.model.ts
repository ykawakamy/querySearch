import { HTMLElement, Node } from "node-html-parser";
import * as vscode from "vscode";
import { Constants } from "../constants";
import * as HTMLParser from "node-html-parser";
import * as vm from "vm";
import { Utils } from "vscode-uri";
import { htmlUtil } from "../util/html-util";
export class SerachResult extends vscode.TreeItem {
  items: vscode.TreeItem[];
  constructor(document: vscode.TextDocument, items: HTMLParser.HTMLElement[]) {
    super(document.uri);
    this.resourceUri = document.uri;
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    this.items = items.map((v) => {
      const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(v);
      const item = new SerachResultItem(document.uri, v, startOffset, endOffset);
      item.parent = this;
      return item;
    });
  }
}

export class SerachResultItem extends vscode.TreeItem {
  uri: vscode.Uri;
  tag: HTMLElement;
  startOffset: number;
  endOffset: number;
  parent!: SerachResult;

  constructor(
    uri: vscode.Uri,
    tag: HTMLElement,
    startOffset: number,
    endOffset: number
  ) {
    super(tag.toString());
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.uri = uri;
    this.resourceUri = uri;
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
