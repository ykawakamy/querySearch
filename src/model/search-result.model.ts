import * as vscode from "vscode";
import { Constants, ContextValues } from "../constants";
import { SearchContext } from "./search-context.model";
import { htmlUtil } from "../util/html-util";
import path = require("path");
import { QSNode } from "./qs-node.model";

export class SearchResultTreeItem extends vscode.TreeItem {
  items: SearchResultItem[] = [];
  isExpanded: boolean = false;
  constructor(public resourceUri: vscode.Uri) {
    super(resourceUri);
  }

  toTreeItem(): vscode.TreeItem {
    return {};
  }
}

export class SearchResult extends SearchResultTreeItem {
  constructor(uri: vscode.Uri, baseItem: SearchResultItem);
  constructor(
    uri: vscode.Uri,
    document: vscode.TextDocument,
    nodes: QSNode[],
    searchContext: SearchContext
  );
  constructor(
    uri: vscode.Uri,
    document: vscode.TextDocument | SearchResultItem,
    nodes?: QSNode[],
    public _searchContext?: SearchContext
  ) {
    super(uri);
    if (document instanceof SearchResultItem) {
      this.items = [document];
      return;
    }
    if (!nodes || !_searchContext) {
      throw new Error();
    }

    const sortedNodes = nodes.sort(
      (a: QSNode, b: QSNode) =>
        (a?.range?.startOpenTag ?? 0) - (b?.range?.startOpenTag ?? 0)
    );

    let stack: SearchResultItem[] = [];
    let index = 0;
    for (const node of sortedNodes) {
      const item = new SearchResultItem(document, node, _searchContext);
      let parentIdx = stack.findLastIndex((prev) => {
        const s = Math.min(prev.startOffset, item.startOffset);
        const e = Math.max(prev.endOffset, item.endOffset);
        const c = item.endOffset - item.startOffset;
        const p = prev.endOffset - prev.startOffset;
        return e - s < c + p;
      });
      if (parentIdx !== -1) {
        const parent = stack[parentIdx];
        parent.items.push(item);
        item._parent = parent;
        stack.splice(parentIdx + 1, Infinity, item);
      } else {
        this.items.push(item);
        item._parent = this;
        stack = [item];
      }
      item.index = index++;
    }
  }

  toTreeItem(): vscode.TreeItem {
    return {
      resourceUri: this.resourceUri,
      description: true,
      collapsibleState: this.isExpanded
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed,
      contextValue: ContextValues.file,
      command: {
        command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
        title: vscode.l10n.t("Open File"),
        arguments: [this],
      },
    };
  }
}

export class SearchResultItem extends SearchResultTreeItem {
  _parent!: SearchResult | SearchResultItem;
  isCompleted = false;
  index = 0;
  startOffset: number;
  endOffset: number;
  label: string;
  range: vscode.Range;

  constructor(
    document: vscode.TextDocument,
    public tag: QSNode,
    public searchContext: SearchContext
  ) {
    super(document.uri);
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(tag);
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.range = new vscode.Range(
      document.positionAt(startOffset),
      document.positionAt(endOffset)
    );
    this.isExpanded = false;
    this.label = tag.outerHTML;
  }

  toTreeItem(): vscode.TreeItem {
    return {
      label: this.label,
      resourceUri: this.resourceUri,
      collapsibleState:
        this.items.length === 0
          ? vscode.TreeItemCollapsibleState.None
          : this.isExpanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      contextValue: ContextValues.result,
      command: {
        command: Constants.COMMAND_QUERYSEARCH_PREVIEWFILE,
        title: vscode.l10n.t("Open File"),
        arguments: [this],
      },
    };
  }
}
