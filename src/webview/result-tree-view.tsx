import { useEffect, useState } from 'react';
import { SearchResult } from '../model/search-result.model';
import { WebviewTreeviewContextProvider } from "treeview-on-vscode-webview/dist/webview/WebViewTreeViewContext";
import { VsccTreeView } from "treeview-on-vscode-webview/dist/webview/treeview";

export function ResultTreeView() {
  return (
    <WebviewTreeviewContextProvider viewId={"searchResult"}>
      <VsccTreeView></VsccTreeView>
    </WebviewTreeviewContextProvider>
  );
}
