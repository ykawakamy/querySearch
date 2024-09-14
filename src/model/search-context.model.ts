export type SearchContext = {
  search: string;
  matchCase: boolean;
  // replace: string;
  // replaceToggle: boolean;
  filterToggle: boolean;
  includes: string;
  excludes: string;
  
  isOnlyOpened: boolean;
  isUseSettings: boolean;

  replaceContext: ReplaceContext;
};

export type WebViewState = {
  search: string;
  matchCase: boolean;
  // replace: string;
  // replaceToggle: boolean;
  filterToggle: boolean;
  includes: string;
  excludes: string;
  isOnlyOpened: boolean;
  isUseSettings: boolean;

  replaceContext: ReplaceContext;

  searchHistory: string[];
  replaceHistory: string[];
  includeHistory: string[];
  excludeHistory: string[];
};

export type ReplaceContext = {
  replace: string;
  replaceToggle: boolean;
};


export const defaultSearchContext: SearchContext = {
  search: "",
  // replace: "",
  // replaceToggle: false,
  filterToggle: false,
  includes: "",
  excludes: "",
  matchCase: false,

  replaceContext: {
    replace: "",
    replaceToggle: false,
  },
  isOnlyOpened: false,
  isUseSettings: false
};

export const defaultWebViewState: WebViewState = {
  search: "",
  // replace: "",
  // replaceToggle: false,
  filterToggle: false,
  includes: "",
  excludes: "",
  matchCase: false,

  replaceContext: {
    replace: "",
    replaceToggle: false,
  },

  searchHistory: [],
  replaceHistory: [],
  includeHistory: [],
  excludeHistory: [],
  isOnlyOpened: false,
  isUseSettings: false
};

