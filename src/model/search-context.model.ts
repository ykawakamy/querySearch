export type SearchContext = {
  search: string;
  replace: string;
  replaceToggle: boolean;
  filterToggle: boolean;
  includes: string;
  excludes: string;
  matchCase: boolean;
};

export const defaultSearchContext: SearchContext = {
  search: "",
  replace: "",
  replaceToggle: false,
  filterToggle: false,
  includes: "",
  excludes: "",
  matchCase: false,
};
