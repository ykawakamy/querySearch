export type SearchContext = {
  search: string;
  // replace: string;
  // replaceToggle: boolean;
  filterToggle: boolean;
  includes: string;
  excludes: string;
  matchCase: boolean;

  replaceContext: ReplaceContext;
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
  }
};
