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
  constructor(
    uri: vscode.Uri,
    public _searchContext: SearchContext
  ) {
    super(uri);
  }

  toTreeItem(): vscode.TreeItem {
    return {
      resourceUri: this.resourceUri,
      description: true,
      iconPath: vscode.ThemeIcon.File,
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
  isCompleted = false;
  index = 0;
  startOffset: number;
  endOffset: number;
  label: string;
  parent!: SearchResult | SearchResultItem;

  constructor(
    uri: vscode.Uri,
    public tag: QSNode,
    public searchContext: SearchContext
  ) {
    super(uri);
    const { startOffset, endOffset } = htmlUtil.getOffsetOfCloseTag(tag);
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.isExpanded = false;
    this.label = tag.outerHTML;
  }

  toTreeItem(): vscode.TreeItem {
    return {
      label: this.label,
      resourceUri: this.resourceUri,
      iconPath: vscode.ThemeIcon.Folder,
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

  getRange(document: vscode.TextDocument): vscode.Range {
    return new vscode.Range(
      document.positionAt(this.startOffset),
      document.positionAt(this.endOffset),
    );
  }
}
