import { ReplaceContext, SearchContext } from "./search-context.model";

export type WebViewEvent = DoSearchEvent | PatchSearchContext;

export interface DoSearchEvent extends SearchContext {
  type: "do-search";
}

export interface PatchSearchContext extends Partial<ReplaceContext> {
  type: "patch-search-context";
}
