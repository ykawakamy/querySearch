import { SearchContext } from "./search-context.model";
import * as vscode from "vscode";

export type SearchQueryPanelState = StateV1 | StateV2;

interface StateV1 {
  searchExpr?: string;

  replaceToggle: boolean;
  replaceExpr?: string;

  filterToggle: boolean;
  filterIncludes?: string;
  filterExcludes?: string;
}

interface StateV2 {
  version: 1;
  searchContext: SearchContext;
  bundle: typeof vscode.l10n.bundle;
}
