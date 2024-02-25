import { SearchContext } from "./search-context.model";

export type WebViewEvent = DoSearchEvent | PatchSearchContext;

export interface DoSearchEvent extends SearchContext {
  type: "do-search";
}

export interface PatchSearchContext extends Partial<SearchContext> {
  type: "patch-search-context";
}
