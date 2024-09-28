export namespace Constants {
  export const COMMAND_QUERYSEARCH_OPENFILE = "querySearch.openFile";
  export const COMMAND_QUERYSEARCH_PREVIEWFILE = "querySearch.previewFile";
  export const COMMAND_QUERYSEARCH_REPLACE = "querySearch.replace";
  export const COMMAND_QUERYSEARCH_REPLACEALL = "querySearch.replaceAll";
  export const COMMAND_QUERYSEARCH_REPLACEFILES = "querySearch.replaceFiles";
  export const COMMAND_QUERYSEARCH_COPY_RESULT = "querySearch.copyResult";

  export const COMMAND_QUERYSEARCH_EXPAND_RECURSIVE = "querySearch.expandRecursive";
  export const COMMAND_QUERYSEARCH_COLLAPSE_RECURSIVE = "querySearch.collapseRecursive";

  export const COMMAND_QUERYSEARCH_EXPAND_ALL = "querySearch.expandAll";
  export const COMMAND_QUERYSEARCH_COLLAPSE_ALL = "querySearch.collapseAll";

  export const SET_CONTEXT_REPLACE_MODE = "querysearch.replaceMode";
  //--
  export const VIEW_ID_SEARCHRESULT = "searchResult";
  export const VIEW_ID_QUERY = "querySearch";

  export const SCHEMA = "querysearch";
  export const SCHEMA_PREVIEW = "querysearch-preview";
}
//--
export enum ContextValues {
  result = "querySearch.result",
  resultItems = "querySearch.resultItems",
  file = "querySearch.file",
}
//--
export enum State {
  latestQuery = "querySerach.latestQuery",
  latestReplaceContext = "querySerach.latestReplaceContext",
}
